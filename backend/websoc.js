const WEBSOC_URL = "https://anteaterapi.com/v2/rest/websoc";
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_LIMIT = 256;
const cache = new Map();

function formatTime(time) {
    const {hour, minute} = time ?? {};
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 ||
        !Number.isInteger(minute) || minute < 0 || minute > 59) {
        return null;
    }
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

function readMeeting(meeting) {
    const start = formatTime(meeting.startTime);
    const end = formatTime(meeting.endTime);
    return {
        days: meeting.days?.trim() || null,
        time: !meeting.timeIsTBA && start && end ? `${start}–${end}` : null,
    };
}

export function readSections(payload, department, number) {
    const sections = new Map();
    for (const school of payload.data.schools) {
        for (const subject of school.departments) {
            if (subject.deptCode !== department) continue;
            for (const course of subject.courses) {
                if (course.courseNumber !== number) continue;
                for (const section of course.sections) {
                    sections.set(section.sectionCode, {
                        code: section.sectionCode,
                        type: section.sectionType,
                        number: section.sectionNum,
                        instructors: [...new Set(section.instructors.map((name) => name.trim()).filter(Boolean))],
                        meetings: section.meetings.map(readMeeting),
                        cancelled: section.isCancelled === true,
                        restrictions: [...new Set(section.restrictions?.match(/\b[A-Z]\b/g) ?? [])],
                    });
                }
            }
        }
    }
    return [...sections.values()].sort((a, b) => a.code.localeCompare(b.code));
}

async function fetchSections(year, quarter, department, number) {
    const url = new URL(WEBSOC_URL);
    url.search = new URLSearchParams({year, quarter, department, courseNumber: number});
    const key = process.env.ANTEATER_API_KEY;
    const response = await fetch(url, {
        headers: key ? {Authorization: `Bearer ${key}`} : {},
        signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
        throw new Error(`WebSoc upstream returned HTTP ${response.status}`);
    }
    return readSections(await response.json(), department, number);
}

export function getSections(year, quarter, department, number) {
    const cacheKey = JSON.stringify([year, quarter, department, number]);
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.sections;
    cache.delete(cacheKey);

    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
    const entry = {expiresAt: Date.now() + CACHE_TTL};
    entry.sections = fetchSections(year, quarter, department, number).catch((error) => {
        if (cache.get(cacheKey) === entry) cache.delete(cacheKey);
        throw error;
    });
    cache.set(cacheKey, entry);
    return entry.sections;
}
