import assert from "node:assert/strict";
import {test} from "node:test";
import {getSections, readSections} from "./websoc.js";

const department = "I&C SCI";
const number = "46";

function payload(sections) {
    return {data: {schools: [{departments: [{
        deptCode: department,
        courses: [{courseNumber: number, sections}],
    }]}]}};
}

test("keeps multiple meetings, deduplicates staff, and preserves TBA and cancellations", () => {
    const section = {
        sectionCode: "35661",
        sectionType: "Dis",
        sectionNum: "A1",
        instructors: ["STAFF", "STAFF", "EXAMPLE, A.", " "],
        meetings: [
            {days: "F", startTime: {hour: 11, minute: 0}, endTime: {hour: 12, minute: 5}},
            {days: "MW", timeIsTBA: true},
        ],
        isCancelled: true,
        restrictions: "A and L, A",
    };
    const lecture = {...section, sectionCode: "35660", sectionType: "Lec", meetings: []};
    const sections = readSections(payload([section, lecture]), department, number);
    assert.deepEqual(sections.map(({code}) => code), ["35660", "35661"]);
    assert.deepEqual(sections[1], {
        code: "35661",
        type: "Dis",
        number: "A1",
        instructors: ["STAFF", "EXAMPLE, A."],
        meetings: [{days: "F", time: "11:00 AM–12:05 PM"}, {days: "MW", time: null}],
        cancelled: true,
        restrictions: ["A", "L"],
    });
});

test("distinguishes empty schedules from unexpected upstream data", () => {
    assert.deepEqual(readSections(payload([]), department, number), []);
    assert.deepEqual(readSections(payload([]), "IN4MATX", number), []);
    assert.throws(() => readSections({error: "upstream failure"}, department, number));
});

test("retries after a failed fetch and shares an in-flight request for the same course", async (t) => {
    const fetch = t.mock.method(globalThis, "fetch", async (url) => {
        assert.equal(url.searchParams.get("department"), department);
        assert.equal(url.searchParams.get("courseNumber"), number);
        assert.equal(url.searchParams.get("quarter"), "Winter");
        if (fetch.mock.callCount() === 0) return new Response(null, {status: 429});
        return Response.json(payload([]));
    });

    await assert.rejects(getSections("2027", "Winter", department, number), /429/);
    const first = getSections("2027", "Winter", department, number);
    const second = getSections("2027", "Winter", department, number);
    assert.equal(first, second);
    assert.deepEqual(await first, []);
    assert.equal(fetch.mock.callCount(), 2);
});
