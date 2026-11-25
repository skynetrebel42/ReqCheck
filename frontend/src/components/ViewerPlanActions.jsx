import { useState } from "react";
import { Bookmark } from "lucide-react";
import { usePlanning } from "../planner/PlanningContext";
import { findCourse, placeCourse, placementLabel, removeCourse, targetOptions, toPlannedCourse } from "../planner/plan";

export default function ViewerPlanActions({course}) {
    const {plan, setPlan, bookmarks, setBookmarks} = usePlanning();
    const [target, setTarget] = useState("");
    const placement = findCourse(plan, course.id);
    const bookmarked = bookmarks.has(course.id);
    const options = targetOptions(plan);
    const selected = options.find((option) => option.value === target) ?? options[0];
    const bookmarkLabel = bookmarked ? "Remove bookmark" : "Bookmark course";

    function toggleBookmark() {
        setBookmarks((current) => {
            const next = new Map(current);
            if (next.has(course.id)) next.delete(course.id);
            else next.set(course.id, toPlannedCourse(course));
            return next;
        });
    }

    function addToPlanner() {
        const [year, quarter] = selected.value.split(":");
        setPlan((current) => placeCourse(current, Number(year), quarter, toPlannedCourse(course)));
    }

    return (
        <div id="course-detail-actions">
            {placement ? (
                <>
                    <span className="viewer-planned">Planned for {placementLabel(placement)}</span>
                    <button type="button" className="viewer-button" onClick={() => setPlan((current) => removeCourse(current, course.id))}>
                        Remove from Planner
                    </button>
                </>
            ) : (
                <>
                    <label className="viewer-target">
                        Quarter
                        <select value={selected.value} onChange={(event) => setTarget(event.target.value)}>
                            {options.map(({value, label}) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </label>
                    <button type="button" className="viewer-button" onClick={addToPlanner}>Add to Planner</button>
                </>
            )}
            <button type="button" className="viewer-bookmark" aria-label={bookmarkLabel} aria-pressed={bookmarked} title={bookmarkLabel} onClick={toggleBookmark}>
                <Bookmark size={20} aria-hidden="true" fill={bookmarked ? "currentColor" : "none"} />
            </button>
        </div>
    );
}
