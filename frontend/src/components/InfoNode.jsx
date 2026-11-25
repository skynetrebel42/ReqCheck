import { Handle, Position, useReactFlow } from "@xyflow/react";
import "../styles/LogicNode.css";
import { useCourseContext } from "./CourseContext.jsx";
import { Orientation } from "../graph/orientation.js";

// Box for a prerequisite that isn't a course (an exam, or something not in the
// course data). The student ticks the checkbox once they have it; that status
// feeds the eligibility count on the courses that depend on it.
function InfoNode({ id, data }) {
  const { updateNodeData } = useReactFlow();
  const { orientation, courseProgress } = useCourseContext();
  const topDown = orientation === Orientation.TOP_DOWN;
  const { marks, setMarks } = courseProgress.exams;
  const isExam = data.kind === "exam";
  const satisfied = isExam ? marks.has(id) : data.satisfied === true;
  const hint = data.kind === "exam" ? "Exam score" : "Not in course data";

  function toggleSatisfied(event) {
    event.stopPropagation();
    if (isExam) {
      setMarks((current) => {
        const next = new Map(current);
        if (next.has(id)) next.delete(id);
        else next.set(id, true);
        return next;
      });
    } else {
      updateNodeData(id, { satisfied: !satisfied });
    }
  }

  return (
    <div className={`info-node ${data.kind} ${satisfied ? "satisfied" : ""}`} title={hint}>
      <input
        type="checkbox"
        className="info-node-check nodrag nopan"
        checked={satisfied}
        onChange={toggleSatisfied}
        title={satisfied ? "Mark as not satisfied" : "Mark as satisfied"}
      />
      <span>{data.label}</span>
      <Handle type="source" position={topDown ? Position.Top : Position.Left} />
    </div>
  );
}

export default InfoNode;
