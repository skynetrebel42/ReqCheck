import "../styles/CoursePlanner.css";
import { useState } from "react";
import SearchBar from "./SearchBar";
import PlannerYear from "./PlannerYear";
import { usePlanning } from "../planner/PlanningContext";
import CourseDetailsPanel from "./CourseDetailsPanel";
import {
    MAX_YEARS, 
    addYear, 
    removeYear, 
    removeCourse, 
    findCourse, 
    countCourses, 
    toPlannedCourse, 
    placeCourse
} from "../planner/plan";
import { readDraggedCourse, writeDraggedCourse } from "../planner/dragAndDrop";
import { useTutorialActions } from "./TutorialActionContext";

function Planner({courseProgress}) {
  const {plan, setPlan} = usePlanning();
  const [viewed, setViewed] = useState(null);
  const { reportTutorialAction } = useTutorialActions();

    function handleSearchPick(result) {
        setViewed(toPlannedCourse(result));
    }

    function handleCourseDragStart(event, result, effectAllowed = "copy") {
        writeDraggedCourse(event, result, effectAllowed);
    }

    function handleCourseDrop(event, yearId, quarter) {
        event.preventDefault();
        const result = readDraggedCourse(event);
        if (!result) {
            return;
        }

        const course = typeof result.label === "string" && "units" in result
            ? result
            : toPlannedCourse(result);

        // Find the course's current location from the plan itself. This is
        // intentionally calculated from the dragged course, not `viewed`,
        // because a drag can begin from either SearchBar or a planned card.
        const currentPlacement = findCourse(plan, course.id);

        // Dropping a course into the quarter it already occupies is a no-op.
        if (
            currentPlacement?.yearId === yearId &&
            currentPlacement?.quarter === quarter
        ) {
            return;
        }

        setPlan((current) => placeCourse(current, yearId, quarter, course));

        if (currentPlacement) {
            reportTutorialAction("planner-course-moved", {
                courseId: course.id,
                fromYearId: currentPlacement.yearId,
                fromQuarter: currentPlacement.quarter,
                yearId,
                quarter,
            });
        } else {
            reportTutorialAction("planner-course-added", {
                courseId: course.id,
                yearId,
                quarter,
            });
        }
    }

  function handleRemoveCourse(courseId) {
    setPlan((current) => removeCourse(current, courseId));
  }

  function handleAddYear() {
    setPlan((current) => addYear(current));
  }

  function handleRemoveYear(yearId) {
    const year = plan.years.find((y) => y.id === yearId);
    const count = year ? countCourses(year) : 0;
    if (
      count > 0 &&
      !window.confirm(
        `Remove this year and the ${count} class${count === 1 ? "" : "es"} in it?`,
      )
    ) {
      return;
    }
    setPlan((current) => removeYear(current, yearId));
  }

    return(
        <div id="planner-container">
            <div id="planner-header">
                <span id="planner-title">Planner</span>
                <div id="planner-toolbar">
                    <SearchBar 
                      onCourseChosen={handleSearchPick} 
                      onCourseDragStart={handleCourseDragStart}
                      tourTarget="planner-search-input"
                      tourContainerTarget="planner-search-area"
                      tourResultTarget="planner-search-result"
                      tourContext="planner"
                    />
                </div>
            </div>

            {plan.years.map((year, index) => (
                <PlannerYear
                    key={year.id}
                    year={year}
                    number={index + 1}
                    canRemove={plan.years.length > 1}
                    onRemoveYear={handleRemoveYear}
                    onRemoveCourse={handleRemoveCourse}
                    selectedId={viewed?.id}
                    onOpenCourse={setViewed}
                    onCourseDrop={handleCourseDrop}
                    onCourseDragStart={handleCourseDragStart}
                />
            ))}
            
            <button
                id="add-year"
                onClick={handleAddYear}
                disabled={plan.years.length >= MAX_YEARS}
                title={plan.years.length >= MAX_YEARS ? `The planner holds up to ${MAX_YEARS} years` : ""}
            >
                + Add year
            </button>

      <CourseDetailsPanel
        courseProgress={courseProgress}
        courseId={viewed ? viewed.id : null}
        visible={viewed !== null}
        onClose={() => setViewed(null)}
      />
    </div>
  );
}

export default Planner;