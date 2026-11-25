import { useState } from "react";
import { ChevronDown, ClipboardList, Upload } from "lucide-react";
import TranscriptImport from "./TranscriptImport";
import WorkspacePanel from "./WorkspacePanel";
import "../styles/SidebarProgressTracker.css";

export default function SideBarProgressTracker({ completedCourses, inprogressCourses, onImport, tutorialOpen }) {
  const [importOpen, setImportOpen] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  function saveCourses(rows) {
    onImport(rows);
    setImportOpen(false);
    setImportMessage(`${rows.length} ${rows.length === 1 ? "course added" : "courses added"} to the tracker.`);
  }

  return (
    <WorkspacePanel title="Course Tracker" shortTitle="Tracker" icon={ClipboardList}
      className="tracker-panel" tutorialOpen={tutorialOpen}>
      <div id="sidebar-container" data-tour="progress-tracker">
        <button type="button" className="transcript-trigger" data-tour="transcript-import" disabled={tutorialOpen}
          onClick={() => { setImportMessage(""); setImportOpen(true); }}>
          <Upload size={16} aria-hidden="true" /> Import course history
        </button>
        {importMessage && <p className="transcript-feedback" role="status">{importMessage}</p>}
        <CourseList courseList={completedCourses} status="completed" title="Completed" />
        <CourseList courseList={inprogressCourses} status="in-progress" title="In progress" />
      </div>
      {importOpen && !tutorialOpen && (
        <TranscriptImport completed={completedCourses} inProgress={inprogressCourses}
          onImport={saveCourses} onClose={() => setImportOpen(false)} />
      )}
    </WorkspacePanel>
  );
}

function CourseList({ courseList, status, title }) {
  return (
    <details className="tracker-course-group">
      <summary className="sidebar-label-container">
        <ChevronDown size={15} aria-hidden="true" />
        <span>{title}</span>
        <span className="course-counter">{courseList.size}</span>
      </summary>
      {courseList.size > 0 ? (
        <ul className="tracked-course-container">
          {[...courseList].map(([key, value]) => (
            <li key={key} className={`tracked-course ${status}`}>
              {typeof value === "string" ? value : `${value.label} · ${value.grade}`}
            </li>
          ))}
        </ul>
      ) : (
        <p className="tracker-empty">No courses yet.</p>
      )}
    </details>
  );
}
