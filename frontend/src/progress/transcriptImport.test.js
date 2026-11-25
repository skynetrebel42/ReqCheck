import assert from "node:assert/strict";
import { test } from "node:test";
import { checkPrerequisites } from "../graph/eligibilityCheck.js";
import {
  addReviewedCourses, indexCourseCodes, parseTranscript, reviewTranscript, SAMPLE_TRANSCRIPT, selectedTranscriptRows, summarizeTranscriptReview,
} from "./transcriptImport.js";

const index = indexCourseCodes([
  { id: "MATH2A", label: "MATH 2A" },
  { id: "I&CSCI31", label: "I&C SCI 31" },
  { id: "IN4MATX131", label: "IN4MATX 131" },
]);
const blank = new Map();
const review = (text, completed = blank, inProgress = blank) =>
  reviewTranscript(parseTranscript(text), index, completed, inProgress);

test("sample and quoted course rows resolve to exact catalogue IDs", () => {
  assert.deepEqual(selectedTranscriptRows(review(SAMPLE_TRANSCRIPT), blank).map(({course, status}) => [course.id, status]), [
    ["MATH2A", "completed"],
    ["I&CSCI31", "completed"],
    ["IN4MATX131", "in-progress"],
  ]);
  assert.equal(review('\uFEFFCourse,Grade\r\n"i&c sci 31","b+"')[0].grade, "B+");
  assert.throws(() => parseTranscript("Student,Course,Grade\nAnonymous,MATH 2A,A"), /header/);
});

test("review skips existing entries, noncredit grades, and unresolved rows", () => {
  const rows = review([
    "Course,Grade",
    "MATH 2A,B",
    "IN4MATX 131,A-",
    "I&C SCI 31,F",
    "I&C SCI 31,NP",
    "I&C SCI 31,W",
    "I&C SCI 31,",
    "MADEUP 99,A",
    "more,than,two",
  ].join("\n"), new Map([["MATH2A", "MATH 2A"]]), new Map([["IN4MATX131", "IN4MATX 131"]]));
  assert.deepEqual(rows.map(({issue}) => issue), [
    "Already tracked. Your existing entry will be kept.",
    "Already tracked. Your existing entry will be kept.",
    "No credit. This attempt will be skipped.",
    "No credit. This attempt will be skipped.",
    "No credit. This attempt will be skipped.",
    "Enter a supported grade or IP.",
    "Course code not found.",
    "Expected two columns. Enter a course code and grade.",
  ]);
  assert.deepEqual(selectedTranscriptRows(rows, blank), []);
});

test("multiple viable attempts require one explicit choice and identical rows collapse", () => {
  const rows = review("Course,Grade\nMATH 2A,C\nMATH2A,C\nMATH 2A,A\nMATH 2A,IP");
  assert.equal(rows[1].issue, "Duplicate attempt. This row will be skipped.");
  assert.deepEqual(selectedTranscriptRows(rows, blank), []);
  assert.equal(selectedTranscriptRows(rows, new Map([["MATH2A", 4]]))[0].grade, "A");
  assert.deepEqual(selectedTranscriptRows(rows, new Map([["MATH2A", null]])), []);
});

test("imported letter grades are compared while P and manual completion grades remain unverified", () => {
  const requirements = [{ type: "course", id: "MATH2A", minGrade: "C" }];
  const evaluate = (value) => checkPrerequisites(requirements, new Map([["MATH2A", value]]), blank);
  assert.deepEqual(evaluate({label: "MATH 2A", grade: "B+"}), {missing: [], toVerify: []});
  assert.deepEqual(evaluate({label: "MATH 2A", grade: "C-"}), {missing: requirements, toVerify: []});
  for (const value of ["MATH 2A", {label: "MATH 2A", grade: "P"}]) {
    assert.deepEqual(evaluate(value), {missing: [], toVerify: requirements});
  }
});

test("corrected rows only change the tracker on save and remain recognized after reload", () => {
  const existing = new Map([["I&CSCI31", "I&C SCI 31"]]);
  const rows = parseTranscript("Course,Grade\nMATH 2X,?\nIN4MATX 131,IP\nI&C SCI 31,A");
  const beforeEdit = reviewTranscript(rows, index, existing, blank);
  assert.equal(selectedTranscriptRows(beforeEdit, blank).length, 1);

  rows[0] = { ...rows[0], code: "MATH 2A", grade: "B+" };
  const selected = selectedTranscriptRows(reviewTranscript(rows, index, existing, blank), blank);
  assert.deepEqual([...existing], [["I&CSCI31", "I&C SCI 31"]]);
  assert.equal(blank.size, 0);

  const reload = (map) => new Map(JSON.parse(JSON.stringify([...map])));
  const completed = reload(addReviewedCourses(existing, selected, "completed"));
  const inProgress = reload(addReviewedCourses(blank, selected, "in-progress"));
  assert.deepEqual([...completed], [
    ["I&CSCI31", "I&C SCI 31"],
    ["MATH2A", { label: "MATH 2A", grade: "B+" }],
  ]);
  assert.deepEqual([...inProgress], [["IN4MATX131", "IN4MATX 131"]]);
  assert.deepEqual(selectedTranscriptRows(reviewTranscript(rows, index, completed, inProgress), blank), []);
});

test("pasted UCI rows support quarter headings, page breaks, spaced subjects, and grade-option flags", () => {
  const uciIndex = indexCourseCodes([
    { id: "MATH2A", label: "MATH 2A" },
    { id: "I&CSCI31", label: "I&C SCI 31" },
    { id: "BIOSCI37", label: "BIO SCI 37" },
    { id: "IN4MATX131", label: "IN4MATX 131" },
  ]);
  const rows = parseTranscript([
    "Unofficial Transcript",
    "TRANSFER COURSE MATH 2A 4.0 B 12.0",
    "AP EXAMPLE (Score 4, Units 4.0) 05/21",
    "COMMUNITY COLLEGE (Units 8.0) 1 Terms to 08/24",
    "Units Transferred 8.0",
    "2025 Fall Quarter",
    "CALCULUS I                         MATH      2A    4.0    B    12.0",
    "INTRO PROGRAMMING\tI&C SCI\t31\t4.0\tC-\t6.8",
    "Unofficial Transcript",
    "INTRO BRAIN SCIENCE BIO SCI 37 4.0 P 0.0 PN",
    "DEANS HONOR LIST",
    "Term Totals           ATTM: 12.0    PSSD: 12.0",
    "Cumulative Totals     ATTM: 12.0    PSSD: 12.0",
    "2026 Winter Quarter",
    "INTRO SOFTWARE                    IN4MATX  131    4.0    I     0.0",
  ].join("\r\n"));
  const reviewed = reviewTranscript(rows, uciIndex, blank, blank);
  assert.equal(reviewed.length, 5);
  assert.match(reviewed[0].issue, /Duplicate attempt/);
  assert.equal(reviewed[3].code, "BIO SCI 37");
  assert.match(reviewed[4].issue, /supported grade/);
  assert.deepEqual(selectedTranscriptRows(reviewed, blank).map(({course, grade}) => [course.id, grade]), [
    ["MATH2A", "B"],
    ["I&CSCI31", "C-"],
    ["BIOSCI37", "P"],
  ]);
});

test("rows outside a term require selection and ambiguous subjects require correction", () => {
  const uciIndex = indexCourseCodes([
    { id: "MATH2A", label: "MATH 2A" },
    { id: "BIOSCI37", label: "BIO SCI 37" },
    { id: "SCI37", label: "SCI 37" },
  ]);
  const parsed = parseTranscript("CALCULUS MATH 2A 4.0 A 16.0\nINTRO TOPIC BIO SCI 37 4.0 B 12.0");
  const reviewed = reviewTranscript(parsed, uciIndex, blank, blank);
  assert.equal(reviewed[0].needsConfirmation, true);
  assert.match(reviewed[1].issue, /Ambiguous course code/);
  assert.deepEqual(selectedTranscriptRows(reviewed, blank), []);
  assert.equal(selectedTranscriptRows(reviewed, new Map([["MATH2A", 1]]))[0].course.id, "MATH2A");
});

test("review summary follows selected attempts and separates tracked, skipped, and unresolved rows", () => {
  const rows = review([
    "Course,Grade",
    "I&C SCI 31,B",
    "MATH 2A,C",
    "MATH 2A,A",
    "MATH 2A,C",
    "IN4MATX 131,F",
    "UNKNOWN 10,B",
  ].join("\n"), new Map([["I&CSCI31", "I&C SCI 31"]]));
  assert.deepEqual(summarizeTranscriptReview(rows, selectedTranscriptRows(rows, blank)), {
    ready: 0, alreadyTracked: 1, needsReview: 3, skipped: 2,
  });
  const chosen = selectedTranscriptRows(rows, new Map([["MATH2A", 4]]));
  assert.deepEqual(summarizeTranscriptReview(rows, chosen), {
    ready: 1, alreadyTracked: 1, needsReview: 1, skipped: 3,
  });
});

test("a long paste produces a compact review summary and skips repeated rows", () => {
  const transcript = [
    "2025 Fall Quarter",
    ...Array(200).fill("INTRO PROGRAMMING   I&C SCI   31   4.0   B   12.0"),
    "Term Totals            ATTM: 4.0    PSSD: 4.0",
  ].join("\n");
  const rows = review(transcript);
  assert.equal(rows.length, 200);
  assert.deepEqual(summarizeTranscriptReview(rows, selectedTranscriptRows(rows, blank)), {
    ready: 1, alreadyTracked: 0, needsReview: 0, skipped: 199,
  });
});
