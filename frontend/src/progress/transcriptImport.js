import { transcriptGradeStatus } from "./grades.js";

export const MAX_TRANSCRIPT_SIZE = 128 * 1024;
export const SAMPLE_TRANSCRIPT = "Course,Grade\nMATH 2A,B+\nI&C SCI 31,A-\nIN4MATX 131,IP";

const csvCell = '("[^"]*"|[^",]*)';
const csvRow = new RegExp(`^${csvCell},${csvCell}$`);

function parseCsv(lines, headerLine) {
  return lines.slice(headerLine + 1).flatMap((line, index) => {
    if (!line.trim()) return [];
    const cells = csvRow.exec(line.trim());
    const clean = (cell) => cell.trim().replace(/^"|"$/g, "").trim();
    return [{
      line: headerLine + index + 2,
      code: cells ? clean(cells[1]) : "",
      grade: cells ? clean(cells[2]) : "",
      malformed: !cells,
    }];
  });
}

const termHeading = /^\d{4}\s+(?:Fall|Winter|Spring|Summer)\b/i;
const termTotals = /^(?:Term|Cumulative)\s+Totals\b/i;
// Course title and subject precede course number, units, grade, and grade points.
// Some rows end with a grade-option flag, such as PN.
const uciCourseRow = /^(.+?)\s+([A-Z]*\d+[A-Z]*)\s+\d+\.\d+[ \t]+([A-Z][A-Z+-]{0,3}|--?)\s+\d+\.\d+(?:\s+[A-Z]{1,5})*$/i;

function parseUciText(lines) {
  let inTerm = false;
  return lines.flatMap((rawLine, index) => {
    const line = rawLine.trim();
    if (termHeading.test(line)) inTerm = true;
    if (termTotals.test(line)) inTerm = false;
    const match = uciCourseRow.exec(line);
    if (!match) return [];

    const [, titleAndSubject, number, grade] = match;
    const columns = titleAndSubject.split(/\t+| {2,}/);
    const subject = columns.at(-1);
    const words = subject.split(/\s+/).slice(-8);
    // Some PDF viewers collapse the column padding. Resolve the subject from
    // catalogue matches against suffixes of the text before the course number.
    const candidateCodes = columns.length === 1
      ? words.map((_, start) => `${words.slice(start).join(" ")} ${number}`)
      : undefined;
    return [{
      line: index + 1,
      code: `${columns.length === 1 ? words.at(-1) : subject} ${number}`,
      grade,
      candidateCodes,
      needsConfirmation: !inTerm,
    }];
  });
}

export function parseTranscript(text) {
  if (text.length > MAX_TRANSCRIPT_SIZE) throw new Error("Use less than 128 KB of course history.");

  const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
  const firstLine = lines.findIndex((line) => line.trim());
  const isCsv = firstLine >= 0 && /^course\s*,\s*grade$/i.test(lines[firstLine].trim());
  const rows = isCsv ? parseCsv(lines, firstLine) : parseUciText(lines);
  if (!rows.length) {
    throw new Error(isCsv
      ? "Add at least one course row."
      : "Paste UCI transcript course rows or use a CSV with the header Course,Grade.");
  }
  if (rows.length > 250) throw new Error("Review up to 250 course rows at a time.");
  return rows;
}

const courseKey = (code) => code.toUpperCase().replace(/\s+/g, "");

export function indexCourseCodes(catalogue) {
  const index = new Map();
  for (const { id, label } of catalogue) {
    for (const key of new Set([courseKey(id), courseKey(label)])) {
      const matches = index.get(key) ?? [];
      matches.push({ id, label });
      index.set(key, matches);
    }
  }
  return index;
}

export function reviewTranscript(rows, index, completed, inProgress) {
  const preferred = new Map();
  const attempts = new Map();
  const review = rows.map((row) => {
    const grade = row.grade.trim().toUpperCase();
    const status = transcriptGradeStatus(grade);
    const matches = new Map((row.candidateCodes ?? [row.code])
      .flatMap((code) => index.get(courseKey(code)) ?? [])
      .map((match) => [match.id, match]));
    const course = matches.size === 1 ? matches.values().next().value : null;
    const result = { ...row, code: row.candidateCodes && course ? course.label : row.code,
      course, grade, status, issue: null, conflict: false };
    if (row.malformed) result.issue = "Expected two columns. Enter a course code and grade.";
    else if (!course) result.issue = matches.size ? "Ambiguous course code. Enter a catalogue code." : "Course code not found.";
    else if (!status) result.issue = "Enter a supported grade or IP.";
    else if (status === "no-credit") {
      result.issue = "No credit. This attempt will be skipped.";
      result.skipped = true;
    } else if (completed.has(course.id) || inProgress.has(course.id)) {
      result.issue = "Already tracked. Your existing entry will be kept.";
      result.alreadyTracked = true;
    } else {
      const key = `${course.id}:${grade}`;
      const earlier = preferred.get(key);
      if (!earlier) attempts.set(course.id, (attempts.get(course.id) ?? 0) + 1);
      if (!earlier || (earlier.needsConfirmation && !row.needsConfirmation)) preferred.set(key, result);
    }
    return result;
  });

  return review.map((row) => {
    if (row.issue) return row;
    if (preferred.get(`${row.course.id}:${row.grade}`) !== row) {
      return { ...row, skipped: true, issue: "Duplicate attempt. This row will be skipped." };
    }
    return { ...row, conflict: attempts.get(row.course.id) > 1 };
  });
}

export function selectedTranscriptRows(review, selections) {
  return review.filter((row) => !row.issue && (
    selections.has(row.course.id)
      ? selections.get(row.course.id) === row.line
      : !row.conflict && !row.needsConfirmation
  ));
}

export function summarizeTranscriptReview(review, selected) {
  const selectedLines = new Set(selected.map((row) => row.line));
  const selectedCourses = new Set(selected.map((row) => row.course.id));
  const summary = { ready: selected.length, alreadyTracked: 0, needsReview: 0, skipped: 0 };
  for (const row of review) {
    if (selectedLines.has(row.line)) continue;
    if (row.alreadyTracked) summary.alreadyTracked++;
    else if (!row.skipped && (row.issue || (
      (row.conflict || row.needsConfirmation) && !selectedCourses.has(row.course.id)
    ))) summary.needsReview++;
    else summary.skipped++;
  }
  return summary;
}

export function addReviewedCourses(courses, rows, status) {
  const next = new Map(courses);
  for (const { course, grade, status: rowStatus } of rows) {
    if (rowStatus !== status || next.has(course.id)) continue;
    next.set(course.id, status === "completed" ? { label: course.label, grade } : course.label);
  }
  return next;
}
