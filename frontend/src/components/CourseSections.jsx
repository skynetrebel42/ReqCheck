import { ChevronDown } from "lucide-react";
import { SCHEDULE_TERMS } from "../data/schedule";

const SECTION_TYPES = {
    Lec: "Lecture",
    Dis: "Discussion",
    Lab: "Lab",
    Sem: "Seminar",
    Tut: "Tutorial",
    Act: "Activity",
};

// Profiles checked against the UCI faculty directory and the named UCI listing.
const VERIFIED_PROFILES = new Map([
    ["IN4MATX161|CROOKS, R.", "https://www.ratemyprofessors.com/professor/2333514"],
    ["COMPSCI161|DILLENCOURT, M.", "https://www.ratemyprofessors.com/professor/59341"],
    ["COMPSCI161|PANAGEAS, I.", "https://www.ratemyprofessors.com/professor/2802347"],
]);

function SectionRows({courseId, term, result, retry}) {
    if (result === null) return <p role="status">Loading sections…</p>;
    if (result === false) {
        return (
            <div role="status">
                <p>Schedule temporarily unavailable. Check the official schedule or try again.</p>
                <button type="button" className="schedule-retry" onClick={retry}>Try again</button>
            </div>
        );
    }
    if (!result.length) return <p role="status">No sections listed for {term.label}.</p>;

    return (
        <div className="schedule-table-scroll" tabIndex={0} role="region" aria-label={`${term.label} class sections`}>
            <table className="schedule-table">
                <thead>
                    <tr>
                        <th scope="col">Section</th>
                        <th scope="col">Days and times</th>
                        <th scope="col">Instructor</th>
                    </tr>
                </thead>
                <tbody>
                    {result.map((section) => (
                        <tr key={section.code}>
                            <th scope="row">
                                {SECTION_TYPES[section.type] ?? section.type} {section.number}
                                <span className="schedule-section-code">{section.code}</span>
                                {section.cancelled && <span className="schedule-cancelled">Cancelled</span>}
                            </th>
                            <td>
                                {section.meetings.length === 0 ? "TBA" : section.meetings.map((meeting, index) => (
                                    <div key={index}>
                                        {meeting.days && <span className="schedule-days">{meeting.days}</span>}
                                        <span>{meeting.time ?? "TBA"}</span>
                                    </div>
                                ))}
                            </td>
                            <td>
                                {section.instructors.length === 0 ? "TBA" : section.instructors.map((name) => {
                                    const profile = VERIFIED_PROFILES.get(`${courseId}|${name}`);
                                    return (
                                        <div key={name}>
                                            {profile ? (
                                                <a href={profile} target="_blank" rel="noopener noreferrer" aria-label={`${name} on Rate My Professors`}>{name}</a>
                                            ) : name}
                                        </div>
                                    );
                                })}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function CourseSections({course, term, onTermChange, sections, retry}) {
    const webSocQuery = new URLSearchParams({
        YearTerm: term.webSocTerm,
        Dept: course.department,
        CourseNum: course.course_number,
        Submit: "Display Web Results",
    });

    return (
        <details className="course-schedule course-disclosure">
            <summary>
                <span>Class sections</span>
                <span className="course-disclosure-meta">{term.label}</span>
                <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="course-disclosure-content">
                <div className="schedule-heading">
                    <label>
                        Quarter
                        <select value={term.id} onChange={(event) => onTermChange(event.target.value)}>
                            {SCHEDULE_TERMS.map(({id, label}) => <option key={id} value={id}>{label}</option>)}
                        </select>
                    </label>
                </div>
                <p className="schedule-source">
                    Data from <a href="https://icssc.link/about-anteaterapi" target="_blank" rel="noopener noreferrer">Anteater API</a>
                    {" · "}
                    <a href={`https://www.reg.uci.edu/perl/WebSoc?${webSocQuery}`} target="_blank" rel="noopener noreferrer">Official UCI Schedule of Classes</a>
                </p>
                <SectionRows courseId={course.id} term={term} result={sections} retry={retry} />
            </div>
        </details>
    );
}
