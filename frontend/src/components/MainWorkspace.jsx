import { BookOpen, RotateCcw } from "lucide-react";
import CourseDetailsPanel from "./CourseDetailsPanel";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  BezierEdge,
  MarkerType,
  useNodesState,
  Panel,
  useEdgesState,
  ReactFlowProvider,
  getNodesBounds,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SearchBar from "./SearchBar";
import CourseNode from "./CourseNode";
import "@xyflow/react/dist/style.css";
import "../styles/MainWorkspace.css";
import axios from "axios";
import ZoomControls from "./ZoomControls";
import GraphLegend from "./GraphLegend";
import WorkspacePanel from "./WorkspacePanel";
import GraphCourseList from "./GraphCourseList";
import ProgramControls, { ProgramPicker } from "./ProgramControls";
import { INFORMATICS_MINOR } from "../data/programs";
import { prerequisitePathEdges, programTargetMatches, removeProgramTarget, visibleProgramNodes } from "../graph/programGraph";
import {
  buildCourseGraph,
  addCourseToWorkspace,
  addFullTreeToWorkspace,
  removeCourseFromGraph,
} from "../graph/courseGraph";
import LogicNode from "./LogicNode";
import InfoNode from "./InfoNode";
import ViewFocus from "./ViewFocus";
import ResponsiveGraph from "./ResponsiveGraph";
import GraphScrollbars from "./GraphScrollbars";
import CourseContext, { useCourseContext } from "./CourseContext";
import { CourseStatus } from "../enums/courseStatus";
import { readItem, writeItem } from "../storage/localStore";
import { useTutorialActions } from "./TutorialActionContext";
import {
  Orientation,
  convertOrientation,
  fromLeftToRight,
  layoutIn,
} from "../graph/orientation";
import {
  loadOrientation,
  loadSavedGraph,
  saveGraph,
  saveOrientation,
} from "../storage/graphStorage";

// How far past the outermost nodes you can pan, same on every side
const PAN_PADDING = 200;

const nodeTypes = {
  courseNode: CourseNode,
  logicNode: LogicNode,
  infoNode: InfoNode,
};

function PrerequisiteEdge(props) {
  const { highlightedEdges } = useCourseContext();
  const style = highlightedEdges.has(props.id) ? {
    ...props.style,
    stroke: "var(--graph-focus-edge)",
    strokeWidth: "calc(var(--graph-line-width) + 1px)",
  } : props.style;
  return <BezierEdge {...props} style={style} />;
}

const edgeTypes = { prerequisite: PrerequisiteEdge };

const STARTING_COURSE_ID = "COMPSCI161";
const GRAPH_VIEW_KEY = "antieligible.graphView";
const HIGH_CONTRAST_KEY = "antieligible.graphHighContrast";

async function fetchCourse(id) {
  const response = await axios.get(`/api/course/${encodeURIComponent(id)}`);
  return response.data;
}

async function fetchCourseTree(id, signal) {
  const response = await axios.get(
    `/api/course-tree/${encodeURIComponent(id)}`, {signal},
  );
  return response.data;
}

function applyCourseStatusFromSidebar(
  graph,
  { completedCourses, inprogressCourses },
) {
  const nodes = graph.nodes.map((node) => {
    if (node.type !== "courseNode") return node;
    let status = CourseStatus.NOT_STARTED;
    if (inprogressCourses.has(node.id)) status = CourseStatus.IN_PROGRESS;
    else if (completedCourses.has(node.id)) status = CourseStatus.COMPLETED;
    return node.data.status === status ? node : {...node, data: {...node.data, status}};
  });
  return {...graph, nodes};
}

function MainWorkspace({ courseProgress, program, onProgramChange, tutorialActive }) {
  // The graph saved in the last visit with the sidebar's statuses applied, null when there is none.
  // Its positions are in the saved orientation, which loadOrientation restores alongside it.
  const [restoredGraph] = useState(() => {
    const savedGraph = loadSavedGraph(program?.id);
    return (
      savedGraph &&
      applyCourseStatusFromSidebar(savedGraph, {
        completedCourses: courseProgress.completed.courses,
        inprogressCourses: courseProgress.inprogress.courses,
      })
    );
  });
  const [nodes, setNodes, onNodesChange] = useNodesState(
    restoredGraph?.nodes ?? [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    restoredGraph?.edges ?? [],
  );
  const [workspaceKey, setWorkspaceKey] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [expandPrerequisites, setExpandPrerequisites] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState(restoredGraph ? "ready" : "loading");
  const [focusRequest, setFocusRequest] = useState({ ids: [] });
  const [highlightedCourseId, setHighlightedCourseId] = useState(null);
  const graphCardRef = useRef(null);
  const [highContrast, setHighContrast] = useState(() => readItem(HIGH_CONTRAST_KEY) === "true");
  const [filters, setFilters] = useState({electives: true, outside: true});
  const [programBusy, setProgramBusy] = useState(false);
  const [programError, setProgramError] = useState("");
  const programReload = useRef(null);
  const programAdd = useRef(null);
  const graphCourses = useMemo(() => nodes.filter((node) => node.type === "courseNode" && node.data.pinned), [nodes]);
  const displayedCourses = useMemo(() => program
    ? graphCourses.filter(({id}) => programTargetMatches(id, program.courseTypes, filters))
    : graphCourses, [program, graphCourses, filters]);
  const completedCourses = courseProgress.completed.courses;
  const inprogressCourses = courseProgress.inprogress.courses;
  const displayedGraph = useMemo(() => {
    const graph = program
      ? visibleProgramNodes(nodes, edges, displayedCourses.map(({id}) => id))
      : {nodes, edges};
    return applyCourseStatusFromSidebar(graph, {completedCourses, inprogressCourses});
  }, [program, nodes, edges, displayedCourses, completedCourses, inprogressCourses]);
  const highlightedEdges = useMemo(() => highlightedCourseId
    ? prerequisitePathEdges(displayedGraph.edges, highlightedCourseId)
    : new Set(), [displayedGraph.edges, highlightedCourseId]);
  // Panning stops a little past the nodes in every direction, GraphScrollbars reads this same box
  const translateExtent = useMemo(() => {
    const visibleNodes = displayedGraph.nodes.filter((node) => !node.hidden);
    if (visibleNodes.length === 0) {
      return [
        [-PAN_PADDING, -PAN_PADDING],
        [PAN_PADDING, PAN_PADDING],
      ];
    }
    const bounds = getNodesBounds(visibleNodes);
    return [
      [bounds.x - PAN_PADDING, bounds.y - PAN_PADDING],
      [bounds.x + bounds.width + PAN_PADDING, bounds.y + bounds.height + PAN_PADDING],
    ];
  }, [displayedGraph.nodes]);


  function focusGraphCourse(id) {
    setHighlightedCourseId(id);
    setFocusRequest({ ids: [id] });
    graphCardRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function toggleHighContrast(event) {
    setHighContrast(event.target.checked);
    writeItem(HIGH_CONTRAST_KEY, String(event.target.checked));
  }
  const [showFullTree, setShowFullTree] = useState(false);
  const [orientation, setOrientation] = useState(loadOrientation);
  // Always the current orientation. Async handlers read this after their fetch
  // (the state value they captured may be stale if the user switched meanwhile),
  // and showStartingCourse reads it so changing orientation doesn't reload the starting course
  const orientationRef = useRef(orientation);
  const getOrientation = useCallback(() => orientationRef.current, []);
  const flowRef = useRef(null);
  const graphNodeDragStart = useRef(null);
  const latestLoad = useRef(0);
  const { reportTutorialAction, subscribeTutorialActions } = useTutorialActions();
  useEffect(() => {
    if (!tutorialActive) return;
    return subscribeTutorialActions((action, { courseId }) => {
      if (action === "tutorial-focus-graph-course") {
        setFocusRequest({ ids: [courseId] });
      }
    });
  }, [tutorialActive, subscribeTutorialActions]);
  const courseProgressRef = useRef(courseProgress);
  useEffect(() => { courseProgressRef.current = courseProgress; }, [courseProgress]);

  function closePanel() {
    if (!isVisible) return;

    setIsVisible(false);
    if (selectedCourse) {
      reportTutorialAction("course-details-closed", { courseId: selectedCourse });
    }
  }

  // Puts the starting course and its prerequisites on the workspace
  const showStartingCourse = useCallback(
    (course) => {
      const graph = fromLeftToRight(
        buildCourseGraph(course),
        orientationRef.current,
      );
      const progress = courseProgressRef.current;
      const appliedCourseStatusGraph = applyCourseStatusFromSidebar(graph, {
        completedCourses: progress.completed.courses,
        inprogressCourses: progress.inprogress.courses,
      });
      setNodes(appliedCourseStatusGraph.nodes);
      setEdges(appliedCourseStatusGraph.edges);
      setWorkspaceKey((key) => key + 1);
      setFocusRequest({ ids: [] });
      setHighlightedCourseId(null);
      setSelectedCourse(null);
      setIsVisible(false);
      setStatus("ready");
    },
    [setNodes, setEdges],
  );
  const loadProgramGraph = useCallback(async (signal) => {
    const courses = [...program.required, ...program.options];
    const trees = await Promise.all(courses.map(({id}) => fetchCourseTree(id, signal)));
    let graph = {nodes: [], edges: []};
    for (const tree of trees) graph = addFullTreeToWorkspace(graph, tree).graph;
    return fromLeftToRight(graph, orientationRef.current);
  }, [program]);

  // Fetch the starting course and replace the personal workspace.
  async function loadStartingCourse() {
    const thisLoad = ++latestLoad.current;
    try {
      const course = await fetchCourse(STARTING_COURSE_ID);
      if (thisLoad === latestLoad.current) showStartingCourse(course);
    } catch (err) {
      if (thisLoad !== latestLoad.current) return;
      console.error("Failed to load the starting course:", err);
      setStatus("failed");
    }
  }

  // Show the starting course, unless a saved graph was restored
  useEffect(() => {
    if (restoredGraph || program) return;
    const thisLoad = ++latestLoad.current;
    fetchCourse(STARTING_COURSE_ID)
      .then((course) => {
        if (thisLoad === latestLoad.current) showStartingCourse(course);
      })
      .catch((err) => {
        if (thisLoad !== latestLoad.current) return;
        console.error("Failed to load the starting course:", err);
        setStatus("failed");
      });
  }, [restoredGraph, showStartingCourse, program]);

  const initializeProgram = useCallback(async (signal) => {
    try {
      const graph = await loadProgramGraph(signal);
      if (signal.aborted) return;
      const progress = courseProgressRef.current;
      const applied = applyCourseStatusFromSidebar(graph, {
        completedCourses: progress.completed.courses,
        inprogressCourses: progress.inprogress.courses,
      });
      setNodes(applied.nodes);
      setEdges(applied.edges);
      setFocusRequest({ ids: applied.nodes.filter(({data}) => data.pinned).map(({id}) => id) });
      setHighlightedCourseId(null);
      setStatus("ready");
      setWorkspaceKey((key) => key + 1);
    } catch (err) {
      if (signal.aborted) return;
      console.error("Failed to load program requirements:", err);
      setStatus("failed");
    }
  }, [loadProgramGraph, setNodes, setEdges]);

  // Load the program only when entering a view without a saved graph.
  useEffect(() => {
    if (!program) return;
    if (!restoredGraph) {
      programReload.current = new AbortController();
      initializeProgram(programReload.current.signal);
    }
    return () => {
      programReload.current?.abort();
      programAdd.current?.abort();
    };
  }, [program, restoredGraph, initializeProgram]);

  // Save the graph after every change so it survives a page refresh.
  // Skipped until the graph is ready, so the empty first render never overwrites the saved one,
  // and while a node is being dragged, so it is written once on drop instead of every frame.
  useEffect(() => {
    const isDragging = nodes.some((node) => node.dragging);
    if (status !== "ready" || isDragging) return;
    saveGraph({ nodes, edges }, program?.id);
  }, [nodes, edges, status, program]);

  // Used by Reset and "Try again", show "Loading..." and load the starting course again
  function reload() {
    setStatus("loading");
    if (program) {
      programAdd.current?.abort();
      programReload.current?.abort();
      programReload.current = new AbortController();
      initializeProgram(programReload.current.signal);
    } else loadStartingCourse();
  }

  function handleReset() {
    if (
      !window.confirm(
        program ? "Restore the original program graph? Your added and removed program targets will be reset."
          : "Reset the prerequisite map to its starting view?",
      )
    ) {
      return;
    }
    reload();
  }

  function handleNodeClick(event, clickedNode) {
    if (clickedNode.type !== "courseNode") {
      return;
    }
    openCourseDetails(clickedNode.id);
  }

  function openCourseDetails(courseId, showPrerequisites = false) {
    setExpandPrerequisites(showPrerequisites);
    setSelectedCourse(courseId);
    setHighlightedCourseId(courseId);
    setIsVisible(true);
  }

  // Called by search or the program picker, using the live graph after the request.
  async function handleSearchSelect(result, fromProgramPicker = false) {
    if (program && (status === "loading" || programAdd.current)) return;
    const request = program ? new AbortController() : null;
    if (request) {
      programAdd.current = request;
      setProgramBusy(true);
      setProgramError("");
    }
    try {
      // Full tree mode gets every prerequisite down the chain, otherwise just the first layer
      const loadFullTree = Boolean(program) || showFullTree;
      const data = loadFullTree
        ? await fetchCourseTree(result.id, request?.signal)
        : await fetchCourse(result.id);
      if (request?.signal.aborted) return;
      latestLoad.current++;
      const flow = flowRef.current;
      const current = flow
        ? { nodes: flow.getNodes(), edges: flow.getEdges() }
        : { nodes, edges };

      // Layout runs left-to-right (new trees go below), so in top-down they land to the right.
      // Read the orientation now, not from before the fetch: `current` is drawn in it.
      let focusIds = [];
      const graph = layoutIn(getOrientation(), current, (ltr) => {
        const result = loadFullTree
          ? addFullTreeToWorkspace(ltr, data)
          : addCourseToWorkspace(ltr, data);
        focusIds = result.focusIds;
        return result.graph;
      });
      const appliedStatusGraph = applyCourseStatusFromSidebar(graph, {
        completedCourses: courseProgress.completed.courses,
        inprogressCourses: courseProgress.inprogress.courses,
      });
      setNodes(appliedStatusGraph.nodes);
      setEdges(appliedStatusGraph.edges);
      setFocusRequest({ ids: focusIds });
      setHighlightedCourseId(null);
      setStatus("ready");

      if (program) {
        const type = program.courseTypes.get(data.id);
        if (type === "Elective" && !filters.electives) setFilters((current) => ({...current, electives: true}));
        if (!type && !filters.outside) setFilters((current) => ({...current, outside: true}));
      }
      if (fromProgramPicker) {
        focusGraphCourse(data.id);
      } else {
        openCourseDetails(data.id);
        reportTutorialAction("graph-course-selected", { courseId: data.id });
      }
    } catch (err) {
      if (request?.signal.aborted) return;
      console.error("Failed to load course:", err);
      if (program) setProgramError("Could not add that course. Try again.");
    } finally {
      if (request && programAdd.current === request) {
        programAdd.current = null;
        setProgramBusy(false);
      }
    }
  }

  function updateProgramFilter(name, value) {
    const next = {...filters, [name]: value};
    setFilters(next);
    const stillVisible = graphCourses
      .filter(({id}) => programTargetMatches(id, program.courseTypes, next))
      .map(({id}) => id);
    if (!stillVisible.includes(highlightedCourseId)) setHighlightedCourseId(null);
    setFocusRequest({ids: stillVisible.includes(highlightedCourseId) ? [highlightedCourseId] : stillVisible});
  }

  function removeGraphCourse(id) {
    handleBeforeDelete({nodes: [{id, type: "courseNode", data: {pinned: true}}]});
  }

  // Runs when something is about to be deleted, the delete key on selected nodes, a node's × button
  // We do the deleting ourselves, so that a course takes its own prerequisites with it
  // and then tell React Flow not to delete anything
  async function handleBeforeDelete({ nodes: toDelete }) {
    const courses = toDelete.filter((node) => node.type === "courseNode" && (!program || node.data.pinned));
    if (courses.length > 0 && flowRef.current) {
      let graph = {
        nodes: flowRef.current.getNodes(),
        edges: flowRef.current.getEdges(),
      };
      for (const course of courses) {
        graph = program ? removeProgramTarget(graph, course.id) : removeCourseFromGraph(graph, course.id);
      }
      setNodes(graph.nodes);
      setEdges(graph.edges);
      if (courses.some((course) => course.id === highlightedCourseId) || !graph.nodes.some((node) => node.id === highlightedCourseId)) {
        setHighlightedCourseId(null);
        setFocusRequest({ ids: [] });
      }
      if (courses.some((course) => course.id === selectedCourse)) {
        setIsVisible(false);
        setSelectedCourse(null);
      }
    }
    return false;
  }

  // Redraws the whole graph in the other orientation. React Flow is remounted
  // (new key) so every handle is re-measured on its new side, and fitView on
  // mount fits the whole rotated graph.
  function changeOrientation(next) {
    if (next === orientation) return;
    const flow = flowRef.current;
    const current = flow
      ? { nodes: flow.getNodes(), edges: flow.getEdges() }
      : { nodes, edges };
    const converted = convertOrientation(current, orientation, next);
    orientationRef.current = next;
    setOrientation(next);
    saveOrientation(next);
    setNodes(converted.nodes);
    setEdges(converted.edges);
    setFocusRequest({ ids: highlightedCourseId ? [highlightedCourseId] : [] });
    setWorkspaceKey((key) => key + 1);
  }

  /**
   * Handle adding and removing courses from the sidebar when the course's status is changed directly on the graph
   * @param course : course node
   */
  function handleSideBarCourse(course) {
    if (course.data.status === CourseStatus.COMPLETED) {
      removeCourseFromSideBar(course.id, CourseStatus.IN_PROGRESS);
      addCourseToSideBar(course, CourseStatus.COMPLETED);
    }
    if (course.data.status === CourseStatus.IN_PROGRESS) {
      removeCourseFromSideBar(course.id, CourseStatus.COMPLETED);
      addCourseToSideBar(course, CourseStatus.IN_PROGRESS);
    }
    if (course.data.status === CourseStatus.NOT_STARTED) {
      removeCourseFromSideBar(course.id, CourseStatus.IN_PROGRESS);
      removeCourseFromSideBar(course.id, CourseStatus.COMPLETED);
    }
  }

  /** 
    Add the course to course collection on course tracker sidebar. The not-started status would not be tracked
    There are two collections: completed course and in-progress course collections
    @param course: course node
    @param status: status of course node which node is changing to (completed or in progress)
  */
  function addCourseToSideBar(course, status) {
    if (status === CourseStatus.COMPLETED && !completedCourses.has(course.id)) {
      courseProgress.completed.setCourses((completedCourses) => {
        const newCompletedCourses = new Map(completedCourses);
        newCompletedCourses.set(course.id, course.data.label);
        return newCompletedCourses;
      });
    }
    if (
      status === CourseStatus.IN_PROGRESS &&
      !inprogressCourses.has(course.id)
    ) {
      courseProgress.inprogress.setCourses((inprogressCourses) => {
        const newInprogressCourses = new Map(inprogressCourses);
        newInprogressCourses.set(course.id, course.data.label);
        return newInprogressCourses;
      });
    }
  }

  /**
   * Remove a course from course tracker sidebar.
   * @param courseId: course id
   * @param status: status of course node which node is changing from
   */
  function removeCourseFromSideBar(courseId, status) {
    if (status === CourseStatus.COMPLETED && completedCourses.has(courseId)) {
      courseProgress.completed.setCourses((completedCourses) => {
        const newCompletedCourses = new Map(completedCourses);
        newCompletedCourses.delete(courseId);
        return newCompletedCourses;
      });
    }

    if (
      status === CourseStatus.IN_PROGRESS &&
      inprogressCourses.has(courseId)
    ) {
      courseProgress.inprogress.setCourses((inprogressCourses) => {
        const newInprogressCourse = new Map(inprogressCourses);
        newInprogressCourse.delete(courseId);
        return newInprogressCourse;
      });
    }
  }

  return (
    <>
      <div id="main-body">
        <div id="main-workspace-container">
          <section className="workspace-search" aria-labelledby="course-search-title">
            <div id="main-workspace-header-container">
              <h1 className="main-workspace-title" id="course-search-title">Find your next course</h1>
              <p className="search-description">Explore UCI prerequisites and check your eligibility.</p>
            </div>
            <div id="tutorial-search-instructions" />
            <div id="search-bar-container" data-tour="course-search-tools">
              <SearchBar onCourseChosen={handleSearchSelect} tourTarget="course-search-input" tourResultTarget="course-search-result" tourContext="graph"/>
              {!program && <button
                className="tree-toggle"
                onClick={() => setShowFullTree((full) => !full)}
              >
                {showFullTree ? "Full tree" : "First layer"}
              </button>}
            </div>
            <div className="program-toolbar">
              <ProgramPicker program={program} onProgramChange={onProgramChange} disabled={tutorialActive} />
              {program && <ProgramControls program={program} targets={graphCourses} filters={filters} onFilterChange={updateProgramFilter}
                onAdd={(id) => handleSearchSelect({id}, true)} busy={status === "loading" || programBusy} error={programError} />}
            </div>
          </section>
          <CourseDetailsPanel
            courseId={selectedCourse}
            expandPrerequisites={expandPrerequisites}
            courseProgress={courseProgress}
            visible={isVisible}
            onClose={closePanel}
          />
          <div id="graph-container" className={highContrast ? "high-contrast" : undefined}>
            <div className="graph-heading">
              <h2>Prerequisite map</h2>
              <div className="graph-controls">
                <label className="graph-contrast" data-tour="graph-high-contrast">
                  <input type="checkbox" checked={highContrast} onChange={toggleHighContrast} />
                  High contrast
                </label>
                <div className="orientation-toggle" role="group" aria-label="Graph direction">
                  {[
                    [Orientation.LEFT_TO_RIGHT, "Left to right"],
                    [Orientation.TOP_DOWN, "Top down"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={orientation === value ? "active" : ""}
                      aria-pressed={orientation === value}
                      onClick={() => changeOrientation(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button type="button" className="reset-button" onClick={handleReset} aria-label="Reset graph">
                  <RotateCcw size={15} aria-hidden="true" /> Reset
                </button>
              </div>
            </div>
            <div className="graph-layout">
            <div className="graph-rail">
              <WorkspacePanel title="Graph legend" shortTitle="Legend" icon={BookOpen}
                className="graph-legend-panel" collapsible tutorialOpen={tutorialActive}>
                <GraphLegend orientation={orientation} />
              </WorkspacePanel>
              <GraphCourseList courses={displayedCourses} focusedId={highlightedCourseId} onFocusCourse={focusGraphCourse}
                onRemoveCourse={program ? removeGraphCourse : undefined} courseTypes={program?.courseTypes} />
            </div>
            <div id="graph-column">
            <div id="graph-card" ref={graphCardRef} data-tour="graph-canvas">
              <ReactFlowProvider>
                <ZoomControls />
                <div id="graph">
                  <CourseContext.Provider
                    value={{
                      handleSideBarCourse,
                      openCourseDetails,
                      highlightedCourseId,
                      highlightedEdges,
                      inProgramView: Boolean(program),
                      courseProgress,
                      applyCourseStatusFromSidebar,
                      orientation,
                      getOrientation,
                    }}
                  >
                    <ReactFlow
                      nodes={displayedGraph.nodes}
                      edges={displayedGraph.edges}
                      nodeTypes={nodeTypes}
                      edgeTypes={edgeTypes}
                      onNodesChange={onNodesChange}
                      onNodeClick={handleNodeClick}
                      onNodeDragStart={(_, node) => {
                        if (node.type === "courseNode") {
                          graphNodeDragStart.current = {
                            id: node.id,
                            x: node.position.x,
                            y: node.position.y,
                          };
                        }
                      }}
                      onNodeDragStop={(_, node) => {
                        const start = graphNodeDragStart.current;
                        graphNodeDragStart.current = null;
                        if (
                          node.type === "courseNode" &&
                          start?.id === node.id &&
                          (Math.abs(start.x - node.position.x) > 1 || Math.abs(start.y - node.position.y) > 1)
                        ) {
                          reportTutorialAction("graph-course-node-moved", { courseId: node.id });
                        }
                      }}
                      onMoveEnd={(event) => {
                        if (event) {
                          reportTutorialAction("graph-canvas-panned");
                        }
                      }}
                      onEdgesChange={onEdgesChange}
                      translateExtent={translateExtent}
                      proOptions={{ hideAttribution: true }}
                      defaultEdgeOptions={{
                        type: "prerequisite",
                        markerEnd: {
                          type: MarkerType.ArrowClosed,
                          color: "var(--graph-edge)",
                        },
                      }}
                      fitView
                      key={workspaceKey}
                      onInit={(instance) => {
                        flowRef.current = instance;
                      }}
                      onBeforeDelete={handleBeforeDelete}
                      deleteKeyCode={["Backspace", "Delete"]}
                      panOnScroll
                      zoomOnScroll={false}
                    >
                      <Background
                        variant={highContrast ? BackgroundVariant.Lines : BackgroundVariant.Dots}
                        color={highContrast ? "#354154" : "var(--req-canvas-grid)"}
                        gap={highContrast ? 24 : undefined}
                      />
                      <Panel position="bottom-center">
                        {status === "loading" && (
                          <div className="workspace-message">Loading...</div>
                        )}
                        {status === "failed" && (
                          <div className="workspace-message">
                            {program ? "Couldn’t load the program graph. Is the backend running?"
                              : "Couldn’t load the starting course. Is the backend running?"}
                            <button onClick={reload}>Try again</button>
                          </div>
                        )}
                        {status === "ready" && nodes.length === 0 && (
                          <div className="workspace-message">
                            Search for a class to add it to the workspace.
                          </div>
                        )}
                      </Panel>
                      <ViewFocus request={focusRequest} />
                      <GraphScrollbars />
                      <ResponsiveGraph />
                    </ReactFlow>
                  </CourseContext.Provider>
                </div>
              </ReactFlowProvider>
            </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SearchWorkspace({courseProgress, tutorialActive}) {
  const [programId, setProgramId] = useState(() => readItem(GRAPH_VIEW_KEY));
  const program = !tutorialActive && programId === INFORMATICS_MINOR.id ? INFORMATICS_MINOR : null;

  function changeProgram(nextId) {
    setProgramId(nextId);
    writeItem(GRAPH_VIEW_KEY, nextId);
  }

  return <MainWorkspace key={program?.id ?? "personal"} courseProgress={courseProgress}
    program={program} onProgramChange={changeProgram} tutorialActive={tutorialActive} />;
}