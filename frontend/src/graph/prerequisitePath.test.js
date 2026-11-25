import assert from "node:assert/strict";
import { test } from "node:test";
import { prerequisitePathEdges } from "./programGraph.js";

test("the highlighted path follows visible prerequisites through alternatives", () => {
    const edges = [
        {id: "option-a", source: "A", target: "OR"},
        {id: "option-b", source: "B", target: "OR", style: {strokeDasharray: "6 4"}},
        {id: "group", source: "OR", target: "SELECTED"},
        {id: "shared", source: "PRE", target: "B"},
        {id: "elsewhere", source: "PRE", target: "OTHER"},
        {id: "next-course", source: "SELECTED", target: "NEXT"},
        {id: "hidden", source: "HIDDEN", target: "SELECTED", hidden: true},
    ];

    assert.deepEqual([...prerequisitePathEdges(edges, "SELECTED")], ["option-a", "option-b", "group", "shared"]);
    assert.deepEqual([...prerequisitePathEdges(edges, "UNKNOWN")], []);
    assert.equal(edges[1].style.strokeDasharray, "6 4");
});
