import { useEffect, useRef, useState } from "react";
import {
  indexCourseCodes, MAX_TRANSCRIPT_SIZE, parseTranscript, reviewTranscript,
  SAMPLE_TRANSCRIPT, selectedTranscriptRows, summarizeTranscriptReview,
} from "../progress/transcriptImport";

export default function TranscriptImport({ completed, inProgress, onClose, onImport }) {
  const dialog = useRef(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [catalogue, setCatalogue] = useState(null);
  const [rows, setRows] = useState(null);
  const [selections, setSelections] = useState(() => new Map());

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  const review = rows ? reviewTranscript(rows, catalogue, completed, inProgress) : [];
  const selected = selectedTranscriptRows(review, selections);
  const selectedLines = new Set(selected.map((row) => row.line));
  const summary = summarizeTranscriptReview(review, selected);

  async function readFile(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_TRANSCRIPT_SIZE) {
      setError("Use a CSV under 128 KB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setText(await file.text());
    } catch {
      setError("Could not read that file. Try pasting the text.");
    } finally {
      setBusy(false);
    }
  }

  async function preview(event) {
    event.preventDefault();
    setError("");
    let parsed;
    try {
      parsed = parseTranscript(text);
    } catch (err) {
      setError(err.message);
      return;
    }

    setBusy(true);
    try {
      if (!catalogue) {
        // The request downloads the same public course index for every user.
        const response = await fetch("/api/course-codes");
        if (!response.ok) throw new Error();
        setCatalogue(indexCourseCodes(await response.json()));
      }
      setSelections(new Map());
      setRows(parsed);
    } catch {
      setError("Could not load the course catalogue. Try reviewing again.");
    } finally {
      setBusy(false);
    }
  }

  function editRow(row, field, value) {
    setRows((current) => current.map((entry) =>
      entry.line === row.line
        ? { ...entry, [field]: value, malformed: false, candidateCodes: field === "code" ? undefined : entry.candidateCodes }
        : entry,
    ));
  }

  function selectRow(row, checked) {
    setSelections((current) => new Map(current).set(row.course.id, checked ? row.line : null));
  }

  return (
    <dialog className="transcript-dialog" ref={dialog} aria-labelledby="transcript-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
    >
      <h2 id="transcript-title">Import course history</h2>
      {rows ? (
        <>
          <p>Edit course codes or grades and choose one attempt per course. Existing Course Tracker entries will be kept.</p>
          <p className="transcript-summary" role="status">
            <span className="transcript-count-ready"><strong>{summary.ready}</strong> ready to add</span>
            <span className="transcript-count-alreadyTracked"><strong>{summary.alreadyTracked}</strong> already tracked</span>
            <span className="transcript-count-needsReview"><strong>{summary.needsReview}</strong> need review</span>
            <span className="transcript-count-skipped"><strong>{summary.skipped}</strong> skipped</span>
          </p>
          <div className="transcript-table-scroll">
            <table>
              <thead>
                <tr><th>Include</th><th>Course code</th><th>Grade</th><th>Review</th></tr>
              </thead>
              <tbody>
                {review.map((row) => (
                  <tr key={row.line}>
                    <td>
                      <input type="checkbox" aria-label={`Include row ${row.line}`}
                        checked={selectedLines.has(row.line)} disabled={Boolean(row.issue)}
                        onChange={(event) => selectRow(row, event.target.checked)}
                      />
                    </td>
                    <td><input aria-label={`Course code, row ${row.line}`} value={row.code}
                      onChange={(event) => editRow(row, "code", event.target.value)} /></td>
                    <td><input className="transcript-grade" aria-label={`Grade, row ${row.line}`} value={row.grade}
                      onChange={(event) => editRow(row, "grade", event.target.value)} /></td>
                    <td>
                      {row.issue || `${row.course.label} · ${row.status === "completed" ? "Completed" : "In progress"}`}
                      {row.conflict && <div>Multiple attempts. Choose one.</div>}
                      {!row.issue && row.needsConfirmation && <div>Outside a UCI term. Select only if this credit applies.</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="transcript-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="button" onClick={() => setRows(null)}>Back to input</button>
            <button type="button" className="transcript-primary" disabled={!selected.length}
              onClick={() => onImport(selected)}>Save to Course Tracker</button>
          </div>
        </>
      ) : (
        <form onSubmit={preview}>
          <p>Copy course rows from your UCI unofficial transcript, including the quarter headings, and paste them below. You can also use a CSV with the header <code>Course,Grade</code>.</p>
          <p className="transcript-privacy">
            Leave out your name and student ID. Paste only the quarter headings and course rows.
            The original text stays in your browser. Only the course records you select are saved to the tracker.
          </p>
          <label className="transcript-file">Open CSV <input type="file" accept=".csv,text/csv"
            onChange={readFile} disabled={busy} /></label>
          <label htmlFor="transcript-csv">Or paste transcript text or CSV</label>
          <textarea id="transcript-csv" rows={9} value={text} onChange={(event) => setText(event.target.value)}
            disabled={busy} maxLength={MAX_TRANSCRIPT_SIZE} spellCheck={false} />
          {error && <p className="transcript-error" role="alert">{error}</p>}
          <div className="transcript-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="button" disabled={busy} onClick={() => { setText(SAMPLE_TRANSCRIPT); setError(""); }}>Use sample CSV</button>
            <button type="submit" className="transcript-primary" disabled={busy || !text.trim()}>
              {busy ? "Loading…" : "Review courses"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
