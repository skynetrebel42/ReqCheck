import assert from "node:assert/strict";
import { test } from "node:test";
import { catalogueCourseUrl } from "../data/catalogue.js";
import { buildCourseGraph, buildFullCourseGraph, removePrereqCourseNode } from "./courseGraph.js";
import { checkPrerequisites, getCourseRequirements } from "./eligibilityCheck.js";
import { requirementText } from "./prereqTree.js";

const course = {
    id: "COMPSCI161",
    department: "COMPSCI",
    course_number: "161",
    prerequisite_tree: {AND: [
        {prereqType: "course", courseId: "I&C SCI 46", minGrade: "C"},
        {prereqType: "course", courseId: "I&C SCI 6B"},
        {prereqType: "course", courseId: "I&C SCI 6D"},
        {OR: [
            {prereqType: "course", courseId: "MATH 2B", minGrade: "D-"},
            {prereqType: "exam", examName: "AP CALCULUS BC", minGrade: "4"},
        ]},
    ]},
};

const label = (items) => items.map(requirementText);
const cleared = new Map([
    ["I&CSCI46", "I&C SCI 46"], ["I&CSCI6B", "I&C SCI 6B"], ["I&CSCI6D", "I&C SCI 6D"],
]);
const blank = new Map();

test("collapsing a branch leaves the missing requirements and grade threshold intact", () => {
    const graph = buildCourseGraph(course);
    const collapsed = removePrereqCourseNode(graph, course.id);
    const full = buildFullCourseGraph({id: course.id, courses: [course], edges: []});
    assert.equal(collapsed.edges.length, 0);
    for (const view of [graph, collapsed, full]) {
        const requirements = view.nodes.find(({id}) => id === course.id).data.requirements;
        const check = checkPrerequisites(requirements, blank, blank);
        assert.deepEqual(label(check.missing), [
            "I&C SCI 46 (grade C or better)",
            "I&C SCI 6B",
            "I&C SCI 6D",
            "One of: MATH 2B, AP Calculus BC (4+)",
        ]);
    }
});

test("either calculus option clears its group and an unrecorded grade remains separate", () => {
    const requirements = getCourseRequirements(course);
    const initial = checkPrerequisites(requirements, cleared, blank);
    assert.equal(initial.missing.length, 1);
    for (const [classes, exams] of [
        [new Map([...cleared, ["MATH2B", "MATH 2B"]]), blank],
        [cleared, new Map([["exam:AP CALCULUS BC:4", true]])],
    ]) {
        const check = checkPrerequisites(requirements, classes, exams);
        assert.equal(check.missing.length, 0);
        assert.deepEqual(label(check.toVerify), ["I&C SCI 46 (grade C or better)"]);
    }
});

test("unparsed catalogue language is distinct from a course with no listed prerequisites", () => {
    assert.equal(getCourseRequirements({prerequisite_tree: {}, prerequisite_text: "Instructor consent required."}), null);
    assert.equal(getCourseRequirements({...course, prerequisite_source: "unparsed"}), null);
    assert.deepEqual(getCourseRequirements({prerequisite_tree: {}}), []);
});

test("catalogue links use a verified subject page or the index fallback", () => {
    assert.equal(catalogueCourseUrl("I&C SCI", "46"), "https://catalogue.uci.edu/allcourses/i_c_sci/#:~:text=I%26C%20SCI%2046.");
    assert.equal(catalogueCourseUrl("UNKNOWN", "101"), "https://catalogue.uci.edu/allcourses/");
});
