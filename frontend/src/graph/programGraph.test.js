import assert from "node:assert/strict";
import { test } from "node:test";
import { INFORMATICS_MINOR } from "../data/programs.js";
import { visibleProgramNodes, removeProgramTarget } from "./programGraph.js";

const graph = {
    nodes: [
        {id: "core", type: "courseNode", data: {pinned: true}},
        {id: "elective", type: "courseNode", data: {pinned: true}},
        {id: "outside", type: "courseNode", data: {pinned: true}},
        {id: "alternative", type: "courseNode", data: {}},
        {id: "group", type: "logicNode", data: {}},
    ],
    edges: [
        {id: "elective–core", source: "elective", target: "core"},
        {id: "group–elective", source: "group", target: "elective"},
        {id: "alternative–group", source: "alternative", target: "group"},
    ],
};

test("filtering retains shared prerequisites and each branch of the path", () => {
    const visible = visibleProgramNodes(graph.nodes, graph.edges, ["core"]);
    assert.deepEqual(visible.nodes.filter((node) => !node.hidden).map(({id}) => id),
        ["core", "elective", "alternative", "group"]);
    assert.ok(visible.edges.every((edge) => !edge.hidden));
    assert.ok(graph.nodes.every((node) => node.hidden === undefined));
});

test("removing a shared course as a target preserves it as a prerequisite", () => {
    const edited = removeProgramTarget(graph, "elective");
    assert.equal(edited.nodes.find(({id}) => id === "elective").data.pinned, false);
    assert.equal(edited.edges.length, graph.edges.length);
    assert.equal(graph.nodes.find(({id}) => id === "elective").data.pinned, true);
    assert.ok(!removeProgramTarget(graph, "outside").nodes.some(({id}) => id === "outside"));
});

test("the minor distinguishes mandatory courses, sequence alternatives, and elective options", () => {
    assert.deepEqual(INFORMATICS_MINOR.required.map(({id}) => id), ["I&CSCI33", "SWE43", "IN4MATX131", "IN4MATX161"]);
    assert.deepEqual(INFORMATICS_MINOR.options.map(({id}) => id), ["I&CSCI31", "I&CSCI32", "I&CSCIH32"]);
    assert.ok(!INFORMATICS_MINOR.electives.some(({id}) => ["SWE43", "IN4MATX131", "IN4MATX161"].includes(id)));
    assert.equal(INFORMATICS_MINOR.courseTypes.get("IN4MATX151"), "Elective");
});
