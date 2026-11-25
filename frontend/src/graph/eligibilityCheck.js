import { meetsMinimumGrade } from "../progress/grades.js";
import { parsePrereqTree } from "./prereqTree.js";

export function getCourseRequirements(course) {
    const parsed = parsePrereqTree(course.prerequisite_tree);
    if (!parsed || course.prerequisite_source === "unparsed") return null;
    if (!parsed.required.length && !parsed.excluded.length &&
        course.prerequisite_text?.trim() && course.prerequisite_source !== "recommended") {
        return null;
    }
    return parsed.required;
}

function checkLeaf(leaf, completedCourses, satisfiedExams) {
    if (leaf.type === "exam") return satisfiedExams.has(leaf.id) ? "met" : "missing";
    if (!completedCourses.has(leaf.id)) return "missing";
    if (!leaf.minGrade || leaf.minGrade === "D-") return "met";
    const comparison = meetsMinimumGrade(completedCourses.get(leaf.id)?.grade, leaf.minGrade);
    if (comparison === null) return "verify";
    return comparison ? "met" : "missing";
}

export function checkPrerequisites(requirements, completedCourses, satisfiedExams) {
    const missing = [];
    const toVerify = [];
    for (const item of requirements ?? []) {
        const options = item.type === "oneOf" ? item.options : [item];
        const statuses = options.map((leaf) => checkLeaf(leaf, completedCourses, satisfiedExams));
        if (statuses.includes("met")) continue;
        if (statuses.includes("verify")) toVerify.push(item);
        else missing.push(item);
    }
    return {missing, toVerify};
}
