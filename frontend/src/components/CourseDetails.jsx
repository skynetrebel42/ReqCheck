import axios from "axios"
import { useEffect, useState } from "react";
import "../styles/CourseDetails.css"
import CourseSections from "./CourseSections";
import DepartmentContact from "./DepartmentContact";
import RestrictionBadges from "./RestrictionBadges";
import { SCHEDULE_TERMS, summarizeRestrictions } from "../data/schedule";
import { useCourseSections } from "../hooks/useCourseSections";
import ViewerPlanActions from "./ViewerPlanActions";
import PrerequisiteCheck from "./PrerequisiteCheck";
import { getCourseRequirements } from "../graph/eligibilityCheck";
import { parsePrereqTree, describeRequirements } from "../graph/prereqTree";

function CourseDetails({courseId, courseProgress, expandPrerequisites}){
        const [course, setCourse] = useState(null);
        const [error, setError] = useState(null);
        const [termId, setTermId] = useState(SCHEDULE_TERMS[0].id);
        const term = SCHEDULE_TERMS.find(({id}) => id === termId);
        const {sections, retry} = useCourseSections(courseId, termId);
        useEffect(() =>{
            async function fetchCourse(){
                try {
                    setError(null);
                    const response = await axios.get(`/api/course/${encodeURIComponent(courseId)}`);
                    setCourse(response.data)
                } catch (err){
                    console.error("Failed to fetch course:", err);
                    setError("Failed to load course details.");
                }
            }

            fetchCourse();
        }, [courseId])

        if (error) return <div className="course-details-message">{error}</div>;
        if (!course) return <div className="course-details-message">Loading course details...</div>;
        const flags = Array.isArray(sections) ? summarizeRestrictions(sections) : [];
        const parsed = parsePrereqTree(course.prerequisite_tree);
        const requirements = parsed ? describeRequirements(parsed) : null;
        const checkableRequirements = getCourseRequirements(course);
        // The backend couldn't turn the catalogue text into a tree, or the tree is too complex to list, show the text itself
        const showTextOnly = Boolean(course.prerequisite_text) && checkableRequirements === null;
        const recommendedOnly = course.prerequisite_source === "recommended";
    return (
        <>
        <div id="course-details-container">
            <header id="course-detail-header">
                <img className="course-logo" src={`${import.meta.env.BASE_URL}images/reqcheck-badge.png`} alt="" />
                <div className="course-heading">
                    <span className="course-code">{course.department} {course.course_number}</span>
                    <h2>{course.title}</h2>
                    <span className="course-subtitle">
                        {course.department_name} · {formatUnits(course.min_units, course.max_units)}
                    </span>
                </div>
            </header>

            <div id="course-info">
                {flags.length > 0 && (
                    <div className="course-restrictions">
                        <span>{term.label} enrollment restrictions</span>
                        <RestrictionBadges flags={flags} />
                    </div>
                )}
                {course.description && <p className="course-description">{course.description}</p>}

                <PrerequisiteCheck course={course} requirements={checkableRequirements} courseProgress={courseProgress} expandInitially={expandPrerequisites}>
                    <dl className="course-facts prerequisite-facts">
                        <div className="course-fact">
                            <dt>Prereqs</dt>
                            <dd>
                                {showTextOnly && (
                                    <>
                                        {course.prerequisite_text}
                                        <span className="course-data-note">
                                            Not checked automatically, confirm in the UCI catalogue
                                        </span>
                                    </>
                                )}
                                {!showTextOnly && !requirements?.required.length &&
                                    (checkableRequirements === null ? "See UCI Catalogue" : "None")}
                                {!showTextOnly && requirements?.required.length > 0 && (
                                    <ul className="requirement-list">
                                        {requirements.required.map((line) => <li key={line}>{line}</li>)}
                                    </ul>
                                )}
                                {!showTextOnly && course.prerequisite_source === "parsed" && (
                                    <span className="course-data-note">Read from the catalogue text</span>
                                )}
                            </dd>
                        </div>
                        {recommendedOnly && (
                            <div className="course-fact">
                                <dt>Recommended</dt>
                                <dd>{course.prerequisite_text.replace(/^recommended:?\s*/i, "")}</dd>
                            </div>
                        )}
                        {requirements !== null && requirements.excluded.length > 0 && (
                            <div className="course-fact">
                                <dt>Not open to</dt>
                                <dd>Students who completed {requirements.excluded.join(", ")}</dd>
                            </div>
                        )}
                        {course.prerequisite_text && !showTextOnly && !recommendedOnly && (
                            <div className="course-fact">
                                <dt>Catalog</dt>
                                <dd className="course-catalog">{course.prerequisite_text}</dd>
                            </div>
                        )}
                    </dl>
                </PrerequisiteCheck>
                <CourseSections course={course} term={term} onTermChange={setTermId} sections={sections} retry={retry} />

                <dl className="course-facts">
                    <div className="course-fact">
                        <dt>Units</dt>
                        <dd>{formatUnits(course.min_units, course.max_units)}</dd>
                    </div>
                    <div className="course-fact">
                        <dt>Department</dt>
                        <dd>
                            {course.department_name ? `${course.department_name} (${course.department})` : course.department}
                            <DepartmentContact department={course.department} number={course.course_number} />
                        </dd>
                    </div>
                </dl>
            </div>
        </div>
        <ViewerPlanActions course={course} />
        </>
    );
}

// 4 -> "4 units", 1 and 4 -> "1-4 units"
function formatUnits(min, max) {
    const units = min === max || max == null ? `${min}` : `${min}-${max}`;
    return `${units} ${units === "1" ? "unit" : "units"}`;
}
export default CourseDetails
