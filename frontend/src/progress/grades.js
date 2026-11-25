const LETTER_GRADES = ["F", "D-", "D", "D+", "C-", "C", "C+", "B-", "B", "B+", "A-", "A", "A+"];

export function transcriptGradeStatus(grade) {
  if (grade === "IP") return "in-progress";
  if (grade === "P" || LETTER_GRADES.indexOf(grade) > 0) return "completed";
  if (["F", "NP", "W"].includes(grade)) return "no-credit";
  return null;
}

export function meetsMinimumGrade(grade, minimum) {
  const achieved = LETTER_GRADES.indexOf(grade);
  const required = LETTER_GRADES.indexOf(minimum);
  if (achieved < 0 || required < 0) return null;
  return achieved >= required;
}
