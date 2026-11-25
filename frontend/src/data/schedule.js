export const SCHEDULE_TERMS = [
    {id: "2027/Winter", label: "Winter 2027", webSocTerm: "2027-03"},
    {id: "2026/Fall", label: "Fall 2026", webSocTerm: "2026-92"},
];

export function summarizeRestrictions(sections) {
    const active = sections.filter((section) => !section.cancelled);
    const byCode = new Map();
    for (const section of active) {
        for (const code of new Set(section.restrictions ?? [])) {
            const listed = byCode.get(code) ?? [];
            listed.push(section.code);
            byCode.set(code, listed);
        }
    }
    return [...byCode.keys()].sort().map((code) => ({
        code,
        sectionCodes: byCode.get(code).length < active.length ? byCode.get(code) : [],
    }));
}
