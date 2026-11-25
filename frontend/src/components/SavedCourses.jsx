import { useState } from "react";
import { Bookmark, LayoutGrid, List, X } from "lucide-react";
import CourseDetailsPanel from "./CourseDetailsPanel";
import RestrictionBadges from "./RestrictionBadges";
import { GE_CATALOGUE_URL, geCategories } from "../data/geCategories";
import { SCHEDULE_TERMS, summarizeRestrictions } from "../data/schedule";
import { useCourseSections } from "../hooks/useCourseSections";
import { usePlanning } from "../planner/PlanningContext";
import { findCourse, placementLabel } from "../planner/plan";
import { readItem, writeItem } from "../storage/localStore";
import "../styles/SavedCourses.css";

const SAVED_VIEW_KEY = "reqcheck.savedView.v1";
const CATEGORIES = [
    ["", "Undecided"], ["major", "Major"], ["minor", "Minor"], ["elective", "Elective"], ["ge", "General education"],
];
const categoryIds = new Set(CATEGORIES.map(([id]) => id));
const categoryOf = (course) => categoryIds.has(course.category) ? course.category : "";

function SavedCourse({course, term, onOpen, onRemove, onCategoryChange}) {
    const {plan} = usePlanning();
    const {sections} = useCourseSections(course.id, term.id);
    const ge = geCategories(course.id);
    let availability = "Checking availability…";
    if (sections === false) availability = "Schedule unavailable";
    else if (sections) {
        const count = sections.filter((section) => !section.cancelled).length;
        availability = count ? `Offered · ${count} section${count === 1 ? "" : "s"}` : "No active sections listed";
    }
    const placement = findCourse(plan, course.id);

    return (
        <li className="saved-card">
            <div className="saved-card-top">
                <button type="button" className="saved-course-name" onClick={onOpen}>
                    <strong>{course.label}</strong>
                    <span>{course.title}</span>
                </button>
                <button type="button" className="saved-remove" title="Remove bookmark" aria-label={`Remove bookmark for ${course.label}`} onClick={onRemove}>
                    <X size={19} aria-hidden="true" />
                </button>
            </div>
            <div className="saved-card-info">
                <div className="saved-meta">
                    <span role="status">{availability}</span>
                    {course.units && <span>{course.units}</span>}
                    {ge.length > 0 && (
                        <a href={GE_CATALOGUE_URL} target="_blank" rel="noopener noreferrer">GE {ge.join(", ")}</a>
                    )}
                    {placement && <span>Planned for {placementLabel(placement)}</span>}
                </div>
                {Array.isArray(sections) && <RestrictionBadges flags={summarizeRestrictions(sections)} />}
            </div>
            <label className="saved-category">
                Use in my plan
                <select value={categoryOf(course)} onChange={(event) => onCategoryChange(event.target.value)} aria-label={`Use in my plan for ${course.label}`}>
                    {CATEGORIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
            </label>
        </li>
    );
}

export default function SavedCourses({courseProgress}) {
    const {bookmarks, setBookmarks} = usePlanning();
    const [termId, setTermId] = useState(SCHEDULE_TERMS[0].id);
    const [openedId, setOpenedId] = useState(null);
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [view, setView] = useState(() => readItem(SAVED_VIEW_KEY) === "list" ? "list" : "cards");
    const courses = [...bookmarks.values()];
    const visibleCourses = categoryFilter === "all" ? courses : courses.filter((course) => categoryOf(course) === categoryFilter);
    const counts = new Map([["all", courses.length]]);
    for (const course of courses) {
        const category = categoryOf(course);
        counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    const term = SCHEDULE_TERMS.find(({id}) => id === termId);

    function changeView(next) {
        setView(next);
        writeItem(SAVED_VIEW_KEY, next);
    }

    function updateBookmark(id, category) {
        setBookmarks((current) => {
            if (!current.has(id)) return current;
            const next = new Map(current);
            if (category === undefined) next.delete(id);
            else next.set(id, {...next.get(id), category});
            return next;
        });
    }

    return (
        <main className="saved-courses">
            <header className="saved-heading">
                <h1><Bookmark size={23} aria-hidden="true" /> Saved courses</h1>
                {bookmarks.size > 0 && (
                    <label>
                        Availability for
                        <select value={termId} onChange={(event) => setTermId(event.target.value)}>
                            {SCHEDULE_TERMS.map(({id, label}) => <option key={id} value={id}>{label}</option>)}
                        </select>
                    </label>
                )}
            </header>
            {bookmarks.size ? (
                <>
                    <div className="saved-toolbar">
                        <div className="saved-toggle-group" role="group" aria-label="Filter by course category">
                            {[["all", "All"], ...CATEGORIES].map(([id, label]) => (
                                <button key={id} type="button" aria-pressed={categoryFilter === id}
                                    onClick={() => setCategoryFilter(id)}>
                                    {label} <span>{counts.get(id) ?? 0}</span>
                                </button>
                            ))}
                        </div>
                        <div className="saved-toggle-group saved-view-toggle" role="group" aria-label="Saved courses view">
                            <button type="button" aria-pressed={view === "cards"} onClick={() => changeView("cards")}>
                                <LayoutGrid size={15} aria-hidden="true" /> Cards
                            </button>
                            <button type="button" aria-pressed={view === "list"} onClick={() => changeView("list")}>
                                <List size={15} aria-hidden="true" /> List
                            </button>
                        </div>
                    </div>
                    <p className="saved-source">Availability and restrictions from <a href="https://icssc.link/about-anteaterapi" target="_blank" rel="noopener noreferrer">Anteater API</a>.</p>
                    {visibleCourses.length === 0 && <p className="saved-empty" role="status">No saved courses in this category.</p>}
                    <ul className={`saved-list${view === "list" ? " saved-list-rows" : ""}`}>
                        {visibleCourses.map((course) => (
                            <SavedCourse key={course.id} course={course} term={term}
                                onOpen={() => setOpenedId(course.id)}
                                onRemove={() => updateBookmark(course.id)}
                                onCategoryChange={(category) => updateBookmark(course.id, category)}
                            />
                        ))}
                    </ul>
                </>
            ) : <p>Bookmark a course from Search or Planner to see it here.</p>}
            {openedId !== null && (
                <CourseDetailsPanel courseId={openedId} visible courseProgress={courseProgress} onClose={() => setOpenedId(null)} />
            )}
        </main>
    );
}
