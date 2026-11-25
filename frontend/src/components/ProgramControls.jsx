import { useState } from "react";
import { INFORMATICS_MINOR } from "../data/programs";

export function ProgramPicker({program, onProgramChange, disabled}) {
    return (
        <label className="program-picker">
            Graph view
            <select value={program?.id ?? ""} onChange={(event) => onProgramChange(event.target.value)} disabled={disabled}>
                <option value="">My courses</option>
                <option value={INFORMATICS_MINOR.id}>{INFORMATICS_MINOR.name} · {INFORMATICS_MINOR.year}</option>
            </select>
        </label>
    );
}

export default function ProgramControls({program, targets, filters, onFilterChange, onAdd, busy, error}) {
    const [selectedId, setSelectedId] = useState("");
    const ids = new Set(targets.map(({id}) => id));
    const groups = [
        {label: "Required courses", courses: program.required},
        {label: "Programming options", courses: program.options},
        {label: "Elective choices", courses: program.electives},
    ].map(({label, courses}) => ({label, courses: courses.filter(({id}) => !ids.has(id))}));
    const value = ids.has(selectedId) ? "" : selectedId;

    return (
        <section className="program-controls" aria-labelledby="program-title">
            <header>
                <h2 id="program-title">{program.name}</h2>
                <a href={program.catalogueUrl} target="_blank" rel="noopener noreferrer">{program.year} UCI Catalogue</a>
            </header>
            <ul>
                <li>Programming: choose I&amp;C SCI 31 → 32 → 33 or H32 → 33.</li>
                <li>Core courses: SWE 43, IN4MATX 131, and IN4MATX 161.</li>
                <li>Electives: at least two additional upper-division IN4MATX or SWE courses.</li>
            </ul>
            <div className="program-options">
                <label>
                    Add a program course
                    <select value={value} onChange={(event) => setSelectedId(event.target.value)} disabled={busy}>
                        <option value="">Choose a course</option>
                        {groups.map(({label, courses}) => courses.length > 0 && (
                            <optgroup key={label} label={label}>
                                {courses.map(({id, label: code}) => <option key={id} value={id}>{code}</option>)}
                            </optgroup>
                        ))}
                    </select>
                </label>
                <button type="button" disabled={!value || busy} onClick={() => onAdd(value)}>
                    {busy ? "Loading…" : "Add to graph"}
                </button>
            </div>
            {error && <p role="status">{error}</p>}
            <div className="program-options program-filters" role="group" aria-label="Filter program graph">
                <label><input type="checkbox" checked={filters.electives} onChange={(event) => onFilterChange("electives", event.target.checked)} /> Show electives</label>
                <label><input type="checkbox" checked={filters.outside} onChange={(event) => onFilterChange("outside", event.target.checked)} /> Show outside-program targets</label>
            </div>
        </section>
    );
}
