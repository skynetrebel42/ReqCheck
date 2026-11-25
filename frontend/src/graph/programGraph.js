import { removeCourseFromGraph } from "./courseGraph.js";

export function programTargetMatches(id, courseTypes, filters) {
    const type = courseTypes.get(id);
    if (type === "Elective") return filters.electives;
    return Boolean(type) || filters.outside;
}

function collectPrerequisiteIds(edges, rootIds) {
    const prerequisites = new Map();
    for (const {source, target} of edges) {
        const sources = prerequisites.get(target) ?? [];
        sources.push(source);
        prerequisites.set(target, sources);
    }

    const visible = new Set(rootIds);
    const pending = [...rootIds];
    while (pending.length) {
        for (const source of prerequisites.get(pending.pop()) ?? []) {
            if (visible.has(source)) continue;
            visible.add(source);
            pending.push(source);
        }
    }

    return visible;
}

export function prerequisitePathEdges(edges, courseId) {
    const visibleEdges = edges.filter((edge) => !edge.hidden);
    const pathNodes = collectPrerequisiteIds(visibleEdges, [courseId]);
    return new Set(visibleEdges.filter((edge) => pathNodes.has(edge.target)).map((edge) => edge.id));
}

export function visibleProgramNodes(nodes, edges, rootIds) {
    const visible = collectPrerequisiteIds(edges, rootIds);
    return {
        nodes: nodes.map((node) => ({...node, hidden: !visible.has(node.id)})),
        edges: edges.map((edge) => ({...edge, hidden: !visible.has(edge.source) || !visible.has(edge.target)})),
    };
}

export function removeProgramTarget(graph, id) {
    if (!graph.edges.some((edge) => edge.source === id)) return removeCourseFromGraph(graph, id);
    return {
        nodes: graph.nodes.map((node) => node.id === id
            ? {...node, data: {...node.data, pinned: false}}
            : node),
        edges: graph.edges,
    };
}
