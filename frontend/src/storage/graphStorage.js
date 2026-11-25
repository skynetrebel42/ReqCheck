import { readItem, readJSON, writeItem, writeJSON } from "./localStore";
import { Orientation } from "../graph/orientation";

// Bump the version when the saved shape changes, so old data is ignored instead of breaking the graph
const GRAPH_STORAGE_KEY = "antieligible.graph.v1";
function workspaceKey(programId) {
  return programId ? `${GRAPH_STORAGE_KEY}.${programId}` : GRAPH_STORAGE_KEY;
}

const ORIENTATION_STORAGE_KEY = "antieligible.graphOrientation";

// React Flow adds these while the user interacts; they describe the moment, not the graph
function withoutInteractionState({
  selected: _selected,
  dragging: _dragging,
  measured: _measured,
  hidden: _hidden,
  ...node
}) {
  return node;
}

function withoutSelection({ selected: _selected, hidden: _hidden, ...edge }) {
  return edge;
}

/**
 * Saves the workspace graph (nodes with their positions and data, and edges).
 * @param graph : { nodes, edges }
 */
export function saveGraph({ nodes, edges }, programId) {
  writeJSON(workspaceKey(programId), {
    nodes: nodes.map(withoutInteractionState),
    edges: edges.map(withoutSelection),
  });
}

/**
 * @returns the saved { nodes, edges }, or null when there is nothing worth
 * showing (never saved, unreadable, or an empty workspace)
 */
export function loadSavedGraph(programId) {
  const graph = readJSON(workspaceKey(programId), null);
  const isValid =
    Array.isArray(graph?.nodes) &&
    Array.isArray(graph?.edges) &&
    (programId || graph.nodes.length > 0);
  return isValid ? graph : null;
}

export function loadOrientation() {
  const saved = readItem(ORIENTATION_STORAGE_KEY);
  return Object.values(Orientation).includes(saved)
    ? saved
    : Orientation.LEFT_TO_RIGHT;
}

export function saveOrientation(orientation) {
  writeItem(ORIENTATION_STORAGE_KEY, orientation);
}
