import { Crosshair, X } from "lucide-react";

export default function GraphCourseList({courses, focusedId, onFocusCourse, onRemoveCourse, courseTypes}) {
    return (
        <aside className="graph-course-list" aria-labelledby="graph-courses-heading">
            <h2 id="graph-courses-heading">Courses on this graph</h2>
            {courses.length ? (
                <ul>
                    {courses.map(({id, data}) => (
                        <li key={id}>
                            <div className="graph-target-actions">
                            <button type="button" aria-pressed={focusedId === id} onClick={() => onFocusCourse(id)}>
                                <span>
                                    {data.label}
                                    {courseTypes && <small>{courseTypes.get(id) ?? "Outside program"}</small>}
                                </span>
                                <Crosshair size={15} aria-hidden="true" />
                            </button>
                            {onRemoveCourse && (
                                <button className="graph-target-remove" type="button" aria-label={`Remove ${data.label} from graph targets`} onClick={() => onRemoveCourse(id)}>
                                    <X size={14} aria-hidden="true" />
                                </button>
                            )}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : <p>{courseTypes ? "No targets match this view." : "Search for a course to add it here."}</p>}
        </aside>
    );
}
