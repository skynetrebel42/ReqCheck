import { ChevronDown } from "lucide-react";
import { cerritosMathAgreement } from "../data/articulation";
import { catalogueCourseUrl } from "../data/catalogue";
import { checkPrerequisites } from "../graph/eligibilityCheck";
import { leafText } from "../graph/prereqTree";

const ICS_DEPARTMENTS = new Set(["COMPSCI", "I&C SCI", "IN4MATX", "GDIM", "STATS"]);
const ICS_CLEARANCE = "https://ics.uci.edu/admissions-information-and-computer-science/admissions-process/ics-forms-petitions/";
const MATH_CLEARANCE = "https://www.math.uci.edu/undergrad-courses/course-registration-and-placement-information";
const ADVISING_OFFICES = "https://academicadvising.uci.edu/offices/";

function RequirementLeaf({leaf, showTransferOptions}) {
    if (leaf.type === "exam") return leafText(leaf);
    const numberStart = leaf.label.lastIndexOf(" ");
    const department = leaf.label.slice(0, numberStart);
    const number = leaf.label.slice(numberStart + 1);
    const cerritosCourse = showTransferOptions ? cerritosMathAgreement.courses.get(leaf.id) : undefined;
    return (
        <>
            <a href={catalogueCourseUrl(department, number)} target="_blank" rel="noopener noreferrer">{leaf.label}</a>
            {leafText(leaf).slice(leaf.label.length)}
            {cerritosCourse && (
                <span className="prerequisite-articulation">
                    Cerritos College {cerritosCourse} ·{" "}
                    <a href={cerritosMathAgreement.url} target="_blank" rel="noopener noreferrer">
                        ASSIST {cerritosMathAgreement.academicYear}
                    </a>
                </span>
            )}
        </>
    );
}

function RequirementList({items, showTransferOptions = false}) {
    return (
        <ul>
            {items.map((item, index) => (
                <li key={index}>
                    {item.type === "oneOf" ? (
                        <>
                            One of
                            <ul>
                                {item.options.map((leaf) => (
                                    <li key={leaf.id}>
                                        <RequirementLeaf leaf={leaf} showTransferOptions={showTransferOptions} />
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : <RequirementLeaf leaf={item} showTransferOptions={showTransferOptions} />}
                </li>
            ))}
        </ul>
    );
}

export default function PrerequisiteCheck({course, requirements, courseProgress, expandInitially, children}) {
    const {missing, toVerify} = checkPrerequisites(
        requirements,
        courseProgress.completed.courses,
        courseProgress.exams.marks,
    );
    const needsReview = requirements === null || missing.length > 0 || toVerify.length > 0;
    const missingLeaves = missing.flatMap((item) => item.options ?? [item]);
    const canCheckEquivalents = missingLeaves.some((leaf) => leaf.type === "course");
    const hasCerritosMatch = missingLeaves.some((leaf) => cerritosMathAgreement.courses.has(leaf.id));
    let clearance = {href: ADVISING_OFFICES, label: "Find your UCI advising office"};
    if (ICS_DEPARTMENTS.has(course.department)) {
        clearance = {href: ICS_CLEARANCE, label: "Check ICS prerequisite clearance"};
    } else if (course.department === "MATH") {
        clearance = {href: MATH_CLEARANCE, label: "Check Math prerequisite clearance"};
    }

    return (
        <details className="prerequisite-check course-disclosure" open={expandInitially || undefined}>
            <summary>
                <span>Prerequisite check</span>
                {missing.length > 0 && (
                    <span className="course-disclosure-meta missing-count">Still missing: {missing.length}</span>
                )}
                <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="prerequisite-check-content course-disclosure-content">
                {requirements === null && <p>Some requirements need a manual check. Review the UCI Catalogue.</p>}
                {missing.length > 0 && (
                    <>
                        <h4>Still missing</h4>
                        <RequirementList items={missing} showTransferOptions />
                        {hasCerritosMatch && (
                            <p className="prerequisite-articulation">
                                The linked Mathematics B.S. agreement lists {cerritosMathAgreement.admissionMinimum} or better for transfer admission.
                                {" "}Check ASSIST for the year you took or plan to take the course.
                            </p>
                        )}
                    </>
                )}
                {toVerify.length > 0 && (
                    <>
                        <h4>Verify minimum grade</h4>
                        <p>Check these grades against the listed minimums.</p>
                        <RequirementList items={toVerify} />
                    </>
                )}
                {!needsReview && (
                    <p>{requirements.length ? "Listed prerequisites appear met based on your tracker." : "No prerequisites listed."}</p>
                )}
                <p><a href={catalogueCourseUrl(course.department, course.course_number)} target="_blank" rel="noopener noreferrer">View UCI Catalogue</a> for course details and enrollment restrictions.</p>
                {needsReview && (
                    <p>
                        Already met a requirement outside UCI?{" "}
                        <a href={clearance.href} target="_blank" rel="noopener noreferrer">{clearance.label}</a>.
                    </p>
                )}
                {canCheckEquivalents && (
                    <p>
                        <a href="https://assist.org/" target="_blank" rel="noopener noreferrer">Check community college equivalents in ASSIST</a>.
                        {" "}Choose your college, UC Irvine, and the year you took or plan to take the community college course.
                        Look for the UCI course code listed above.
                    </p>
                )}
                {children}
            </div>
        </details>
    );
}
