import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { TUTORIAL_STEPS } from "../tutorialSteps";
import { useTutorialActions } from "./TutorialActionContext";
import "../styles/TutorialGuide.css";

const SPOTLIGHT_PADDING = 9;
const VIEWPORT_MARGIN = 16;
const PANEL_GAP = 14;
const EMPTY_TASK_ACTIONS = Object.freeze([]);

function sameRectList(previous, next) {
    if (previous.length !== next.length) return false;
    return previous.every((rect, index) => {
        const candidate = next[index];
        return candidate &&
            Math.abs(rect.left - candidate.left) < 0.5 &&
            Math.abs(rect.top - candidate.top) < 0.5 &&
            Math.abs(rect.width - candidate.width) < 0.5 &&
            Math.abs(rect.height - candidate.height) < 0.5;
    });
}

function getPanelPosition(targetRects, panelSize, viewport, placement, panelLocation, requireClear) {
    const targetRect = targetRects[0];
    const { width: viewportWidth, height: viewportHeight } = viewport;
    const panelWidth = Math.min(panelSize.width || 360, viewportWidth - VIEWPORT_MARGIN * 2);
    const panelHeight = panelSize.height || 230;

    // A fixed viewport position is useful for steps where the floating panel
    // must stay clear of an interactive area (for example, the graph or a menu).
    // panelLocation accepts top/bottom and left/right offsets in pixels.
    if (panelLocation) {
        const requestedLeft = Number.isFinite(panelLocation.left)
            ? panelLocation.left
            : Number.isFinite(panelLocation.right)
                ? viewportWidth - panelLocation.right - panelWidth
                : (viewportWidth - panelWidth) / 2;
        const requestedTop = Number.isFinite(panelLocation.top)
            ? panelLocation.top
            : Number.isFinite(panelLocation.bottom)
                ? viewportHeight - panelLocation.bottom - panelHeight
                : (viewportHeight - panelHeight) / 2;

        const maxLeft = Math.max(VIEWPORT_MARGIN, viewportWidth - panelWidth - VIEWPORT_MARGIN);
        const maxTop = Math.max(VIEWPORT_MARGIN, viewportHeight - panelHeight - VIEWPORT_MARGIN);

        return {
            left: Math.max(VIEWPORT_MARGIN, Math.min(requestedLeft, maxLeft)),
            top: Math.max(VIEWPORT_MARGIN, Math.min(requestedTop, maxTop)),
        };
    }

    if (!targetRect) {
        return {
            left: Math.max(VIEWPORT_MARGIN, (viewportWidth - panelWidth) / 2),
            top: Math.max(VIEWPORT_MARGIN, (viewportHeight - panelHeight) / 2),
        };
    }

    const candidates = {
        right: {
            left: targetRect.right + PANEL_GAP,
            top: targetRect.top,
        },
        left: {
            left: targetRect.left - panelWidth - PANEL_GAP,
            top: targetRect.top,
        },
        bottom: {
            left: targetRect.left + (targetRect.width - panelWidth) / 2,
            top: targetRect.bottom + PANEL_GAP,
        },
        top: {
            left: targetRect.left + (targetRect.width - panelWidth) / 2,
            top: targetRect.top - panelHeight - PANEL_GAP,
        },
        "top-right": {
            left: targetRect.right - panelWidth,
            top: targetRect.top - panelHeight - PANEL_GAP,
        },
    };

    const fallbackOrder = [placement, "right", "left", "bottom", "top"];
    const tried = new Set();
    let chosen = null;
    for (const candidateName of fallbackOrder) {
        if (!candidateName || tried.has(candidateName) || !candidates[candidateName]) {
            continue;
        }
        tried.add(candidateName);
        const candidate = candidates[candidateName];
        const fitsHorizontally = candidate.left >= VIEWPORT_MARGIN && candidate.left + panelWidth <= viewportWidth - VIEWPORT_MARGIN;
        const fitsVertically = candidate.top >= VIEWPORT_MARGIN && candidate.top + panelHeight <= viewportHeight - VIEWPORT_MARGIN;
        const overlapsTarget = targetRects.some((rect) =>
            candidate.left < rect.right + SPOTLIGHT_PADDING &&
            candidate.left + panelWidth > rect.left - SPOTLIGHT_PADDING &&
            candidate.top < rect.bottom + SPOTLIGHT_PADDING &&
            candidate.top + panelHeight > rect.top - SPOTLIGHT_PADDING
        );
        if (fitsHorizontally && fitsVertically && !overlapsTarget) {
            chosen = candidate;
            break;
        }
    }

    if (!chosen && requireClear) return null;
    chosen ??= candidates.bottom;

    return {
        left: Math.max(VIEWPORT_MARGIN, Math.min(chosen.left, viewportWidth - panelWidth - VIEWPORT_MARGIN)),
        top: Math.max(VIEWPORT_MARGIN, Math.min(chosen.top, viewportHeight - panelHeight - VIEWPORT_MARGIN))
    };
}

function matchesTaskAction(requirement, actionName, payload = {}) {
    if (requirement.event !== actionName) {
        return false;
    }
    return Object.entries(requirement.match ?? {}).every(([key, expected]) => {
        if (key === "includesCourseId") {
            return Array.isArray(payload.courseIds) && payload.courseIds.includes(expected);
        }
        return payload[key] === expected;
    });
}

export default function TutorialGuide({ open, onExit, onFinish }) {
    const [stepIndex, setStepIndex] = useState(0);
    const [targetRects, setTargetRects] = useState([]);
    const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight});
    const [panelPosition, setPanelPosition] = useState(null);
    const [avoidRect, setAvoidRect] = useState(null);
    const [inline, setInline] = useState(false);
    const [completedTaskActionIds, setCompletedTaskActionIds] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const panelRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { reportTutorialAction, subscribeTutorialActions } = useTutorialActions();
    const step = TUTORIAL_STEPS[stepIndex];
    const taskActions = step.task?.actions ?? EMPTY_TASK_ACTIONS;
    const taskComplete = taskActions.every((action) => completedTaskActionIds.includes(action.id));
    const isFirstStep = stepIndex === 0;
    const isLastStep = stepIndex === TUTORIAL_STEPS.length - 1;
    const panelStyle = useMemo(() => panelPosition ? { left: `${panelPosition.left}px`, top: `${panelPosition.top}px` } : undefined, [panelPosition]);

    // Reset each exercise when entering its step, then listen for actions, reported by the SearchBar, graph, course viewer, and Planner
    useEffect(() => {
        if (!open || taskActions.length === 0) {
            return undefined;
        }

        return subscribeTutorialActions((actionName, payload) => {
            setCompletedTaskActionIds((current) => {
                const remaining = taskActions.filter((requirement) => !current.includes(requirement.id));
                const nextRequirement = (step.task?.anyOrder ? remaining : remaining.slice(0, 1))
                    .find((requirement) => matchesTaskAction(requirement, actionName, payload));
                if (!nextRequirement) {
                    return current;
                }
                return [...current, nextRequirement.id];
            });
        });
    }, [open, stepIndex, step.task?.anyOrder, taskActions, subscribeTutorialActions]);

    // Temporarily let native drag events pass through the dimmer so a drag can travel from a highlighted source to a separate highlighted drop target
    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const handleDragStart = () => setIsDragging(true);
        const handleDragEnd = () => setIsDragging(false);
        document.addEventListener("dragstart", handleDragStart, true);
        document.addEventListener("dragend", handleDragEnd, true);
        document.addEventListener("drop", handleDragEnd, true);
        return () => {
            document.removeEventListener("dragstart", handleDragStart, true);
            document.removeEventListener("dragend", handleDragEnd, true);
            document.removeEventListener("drop", handleDragEnd, true);
        };
    }, [open]);

    // Each tour step declares which route it belongs to, spotlight should always be live UI
    useEffect(() => {
        if (open && step.path && location.pathname !== step.path) {
            navigate(step.path);
        }
    }, [open, step.path, location.pathname, navigate]);

    // Some exercises need an input/dropdown to remain visible after the user advances from the previous instruction panel
    // Refocusing reopens its existing results without changing the query they just entered
    useEffect(() => {
        if (!open || !step.focusTarget || (step.path && location.pathname !== step.path)) {
            return;
        }
        const target = document.querySelector(step.focusTarget);
        target?.focus();
    }, [open, stepIndex, step.focusTarget, step.path, location.pathname]);

    // Find the current target and keep the spotlight aligned during resize, scrolling, and React content updates
    useEffect(() => {
        if (!open) {
            return undefined;
        }

        let targetElements = [];
        let resizeObserver = null;
        let graphViewportObserver = null;
        let focusedGraphTarget = null;
        const selectors = step.targets ?? (step.target ? [step.target] : []);

        function updateTargets() {
            if (selectors.length === 0) {
                targetElements = [];
                setTargetRects([]);
                return;
            }

            const nextTargets = selectors.map((selector) => document.querySelector(selector)).filter(Boolean);
            const targetsChanged = nextTargets.length !== targetElements.length || nextTargets.some((element, index) => element !== targetElements[index]);
            if (targetsChanged) {
                resizeObserver?.disconnect();
                targetElements = nextTargets;
                if (typeof ResizeObserver !== "undefined" && targetElements.length > 0) {
                    resizeObserver = new ResizeObserver(updateTargets);
                    targetElements.forEach((element) => resizeObserver.observe(element));
                }
                const firstTarget = targetElements[0];
                if (step.focusGraphCourseId && firstTarget) {
                    if (focusedGraphTarget !== firstTarget) {
                        focusedGraphTarget = firstTarget;
                        const graph = firstTarget.closest(".react-flow");
                        graph?.scrollIntoView({ block: "center", inline: "nearest" });
                        const graphViewport = firstTarget.closest(".react-flow__viewport");
                        graphViewportObserver?.disconnect();
                        if (graphViewport) {
                            graphViewportObserver = new MutationObserver(updateTargets);
                            graphViewportObserver.observe(graphViewport, {
                                attributes: true, attributeFilter: ["style"],
                            });
                        }
                        reportTutorialAction("tutorial-focus-graph-course", { courseId: step.focusGraphCourseId });
                    }
                } else {
                    firstTarget?.scrollIntoView({ block: "nearest", inline: "nearest" });
                }
            }

            const nextAvoidRect = step.avoidTarget
                ? document.querySelector(step.avoidTarget)?.getBoundingClientRect() ?? null
                : null;
            setAvoidRect((current) =>
                sameRectList(current ? [current] : [], nextAvoidRect ? [nextAvoidRect] : [])
                    ? current : nextAvoidRect
            );

            const nextRects = nextTargets.flatMap((element) => {
                const rect = element.getBoundingClientRect();
                const graph = step.focusGraphCourseId ? element.closest(".react-flow") : null;
                if (graph) {
                    const bounds = graph.getBoundingClientRect();
                    if (rect.left < bounds.left || rect.right > bounds.right ||
                        rect.top < bounds.top || rect.bottom > bounds.bottom) return [];
                }
                return [{
                    left: rect.left,
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                    width: rect.width,
                    height: rect.height,
                }];
            });

            setTargetRects((current) =>
                sameRectList(current, nextRects) ? current : nextRects
            );
        }

        function updateViewport() {
            const nextViewport = { width: window.innerWidth, height: window.innerHeight };
            setViewport((current) =>
                current.width === nextViewport.width && current.height === nextViewport.height
                    ? current
                    : nextViewport,
            );
            updateTargets();
        }

        updateTargets();
        const observer = new MutationObserver(updateTargets);
        observer.observe(document.body, { childList: true, subtree: true});
        window.addEventListener("resize", updateViewport);
        window.addEventListener("scroll", updateTargets, true);

        return () => {
            observer.disconnect();
            resizeObserver?.disconnect();
            graphViewportObserver?.disconnect();
            window.removeEventListener("resize", updateViewport);
            window.removeEventListener("scroll", updateTargets, true);
        };
    }, [open, step.target, step.targets, step.avoidTarget, step.focusGraphCourseId, stepIndex, location.pathname, reportTutorialAction]);

    // Position the small instruction panel beside highlighted element
    useLayoutEffect(() => {
        if (!open || inline) {
            return undefined;
        }

        function updatePosition() {
            const panel = panelRef.current?.getBoundingClientRect();
            const nextPosition = getPanelPosition(
                step.avoidTarget && avoidRect ? [...targetRects, avoidRect] : targetRects,
                { width: panel?.width ?? 360, height: panel?.height ?? 230 },
                viewport,
                step.placement,
                step.panelLocation,
                Boolean(step.inlineTarget),
            );
            if (!nextPosition) {
                setInline(true);
                return;
            }

            setPanelPosition((current) => {
                if (
                    current &&
                    Math.abs(current.left - nextPosition.left) < 0.5 &&
                    Math.abs(current.top - nextPosition.top) < 0.5
                ) {
                    return current;
                }
                return nextPosition;
            });
        }

        updatePosition();
        let observer;
        if (panelRef.current && typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver(updatePosition);
            observer.observe(panelRef.current);
        }
        return () => observer?.disconnect();
    }, [open, inline, targetRects, avoidRect, viewport, step.placement, step.panelLocation, step.inlineTarget, step.avoidTarget]);

    // Keep incidental clicks from changing the workspace during an exercise.
    useEffect(() => {
        if (!open) {
            return undefined;
        }

        function guardOutsideInteraction(event) {
            if (panelRef.current?.contains(event.target)) {
                return;
            }

            // Keep the guide open for both spotlighted elements and any explicitly
            // permitted interaction areas. The course viewer's backdrop is one such
            // area: clicking it should close the viewer, not dismiss the tutorial.
            const spotlightSelectors = step.targets ?? (step.target ? [step.target] : []);
            const interactionSelectors = [
                ...spotlightSelectors,
                ...(step.allowInteractionTargets ?? []),
            ];
            const eventPath = typeof event.composedPath === "function" ? event.composedPath() : [];
            const clickedAllowedTarget = interactionSelectors.some((selector) => {
                const matchingElement = document.querySelector(selector);
                return Boolean(
                    matchingElement &&
                    (matchingElement === event.target ||
                        matchingElement.contains(event.target) ||
                        eventPath.includes(matchingElement))
                );
            });
            if (clickedAllowedTarget) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                // On the course-viewer step, let CourseDetailsPanel handle Escape.
                // Its window-level listener closes the viewer; the tutorial stays open.
                if (step.escapeClosesTarget && document.querySelector(step.escapeClosesTarget)) {
                    return;
                }
                onExit();
            }
        }

        document.addEventListener("pointerdown", guardOutsideInteraction, true);
        document.addEventListener("click", guardOutsideInteraction, true);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", guardOutsideInteraction, true);
            document.removeEventListener("click", guardOutsideInteraction, true);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onExit, step.target, step.targets, step.allowInteractionTargets, step.escapeClosesTarget]);

    if (!open) return null;

    function goBack() {
        setCompletedTaskActionIds([]);
        setTargetRects([]);
        setAvoidRect(null);
        setInline(false);
        setStepIndex((current) => Math.max(0, current - 1));
    }

    function goNext() {
        if (!taskComplete) {
            return;
        }
        if (isLastStep) {
            onFinish();
            return;
        }
        setCompletedTaskActionIds([]);
        setTargetRects([]);
        setAvoidRect(null);
        setInline(false);
        setStepIndex((current) => Math.min(TUTORIAL_STEPS.length - 1, current + 1));
    }

    const spotlights = targetRects.map((rect) => ({
        left: Math.max(0, rect.left - SPOTLIGHT_PADDING),
        top: Math.max(0, rect.top - SPOTLIGHT_PADDING),
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
    }));
    const outerPath = `M0 0 H${viewport.width} V${viewport.height} H0 Z`;
    const holePath = spotlights.map((spotlight) => ` M${spotlight.left} ${spotlight.top} h${spotlight.width} v${spotlight.height} h-${spotlight.width} Z`).join("");

    const inlineSlot = inline && step.inlineTarget ? document.querySelector(step.inlineTarget) : null;
    const scrim = (
        <svg
            className={`tutorial-scrim${isDragging ? " tutorial-scrim-dragging" : ""}`}
            width={viewport.width}
            height={viewport.height}
            viewBox={`0 0 ${viewport.width} ${viewport.height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            pointerEvents="none"
        >
            <path
                d={`${outerPath}${holePath}`}
                fill="#07172d"
                fillOpacity="0.48"
                fillRule="evenodd"
                /* The SVG is a visual mask only. Never let it become the click target. */
                pointerEvents="none"
            />
            {spotlights.map((spotlight, index) => (
                <rect
                    key={index}
                    x={spotlight.left}
                    y={spotlight.top}
                    width={spotlight.width}
                    height={spotlight.height}
                    rx="9"
                    fill="none"
                    stroke="#2680ed"
                    strokeWidth="2"
                    pointerEvents="none"
                />
            ))}
        </svg>
    );

    const card = (
        <section
            className={`tutorial-card${isFirstStep ? " tutorial-card-welcome" : ""}${inlineSlot ? " tutorial-card-inline" : ""}`}
            ref={panelRef}
            style={inlineSlot ? undefined : panelStyle}
            role="dialog"
            aria-labelledby="tutorial-title"
            aria-describedby="tutorial-description"
            onPointerDown={(event) => event.stopPropagation()}
        >
            <span className="tutorial-step-number">{stepIndex + 1}</span>
            <button
                className="tutorial-close"
                type="button"
                onClick={onExit}
                title="Exit tutorial (Esc)"
            >
                Exit tutorial
            </button>
            <div className="tutorial-card-content">
            <div className="tutorial-eyebrow">
                {isFirstStep ? "YOUR QUICK START GUIDE" : `STEP ${stepIndex + 1} OF ${TUTORIAL_STEPS.length}`}
            </div>
            <h2 id="tutorial-title">{step.title}</h2>
            <p id="tutorial-description">{step.description}</p>
            {step.note && <p className="tutorial-note">{step.note}</p>}
            {step.task && (
                <div className="tutorial-task">
                    <div className="tutorial-task-heading">TRY IT YOURSELF</div>
                    <p className="tutorial-task-prompt">{step.task.prompt}</p>
                    <ul className="tutorial-task-list">
                        {taskActions.map((action, index) => {
                            const complete = completedTaskActionIds.includes(action.id);
                            return (
                                <li key={action.id} className={complete ? "complete" : ""}>
                                    <span className="tutorial-task-check">{complete ? "✓" : index + 1}</span>
                                    <span>{action.label}</span>
                                </li>
                            );
                        })}
                    </ul>
                    {step.task.targetButtonLabel && (
                        <button
                            className="tutorial-text-button tutorial-task-button"
                            type="button"
                            onClick={() => document.querySelector(step.target)?.click()}
                        >
                            {step.task.targetButtonLabel}
                        </button>
                    )}
                    <div className={`tutorial-task-status${taskComplete ? " complete" : ""}`} aria-live="polite">
                        {taskComplete ? "Nice work! You can continue." : "Complete the actions above to unlock Next."}
                    </div>
                </div>
            )}
            </div>
            <div className="tutorial-footer">
                <div className="tutorial-progress" role="img" aria-label={`Step ${stepIndex + 1} of ${TUTORIAL_STEPS.length}`}>
                    {TUTORIAL_STEPS.map((_, index) => (
                        <span
                            key={index}
                            className={index === stepIndex ? "active" : index < stepIndex ? "complete" : ""}
                        />
                    ))}
                </div>
                <div className="tutorial-footer-actions">
                    <button className="tutorial-text-button" type="button" onClick={onFinish}>
                        Skip tutorial
                    </button>
                    <div className="tutorial-navigation">
                        {!isFirstStep && (
                            <button className="tutorial-back-button" type="button" onClick={goBack}>
                                Back
                            </button>
                        )}
                        <button className="tutorial-next-button" type="button" onClick={goNext} disabled={!taskComplete}>
                            {step.buttonLabel ?? (isLastStep ? "Finish" : "Next")}
                            <span aria-hidden="true">→</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );

    return (
        <>
            {scrim}
            {inlineSlot ? createPortal(card, inlineSlot) : card}
        </>
    );
}