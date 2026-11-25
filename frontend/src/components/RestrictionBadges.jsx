import { useId } from "react";
import { BookOpen, GraduationCap, KeyRound, Lock, Users } from "lucide-react";
import "../styles/RestrictionBadges.css";

const RESTRICTIONS = {
    A: ["Prerequisite required", BookOpen],
    B: ["Authorization code required", KeyRound],
    C: ["Fee required", Lock],
    D: ["Pass/no pass only", Lock],
    E: ["Freshmen only", Users],
    F: ["Sophomores only", Users],
    G: ["Lower-division only", Users],
    H: ["Juniors only", Users],
    I: ["Seniors only", Users],
    J: ["Upper-division only", Users],
    K: ["Graduate students only", GraduationCap],
    L: ["Major only", GraduationCap],
    M: ["Non-major only", GraduationCap],
    N: ["School major only", GraduationCap],
    O: ["Non-school major only", GraduationCap],
    R: ["Biomedical pass/fail only", Lock],
    S: ["Satisfactory/unsatisfactory only", Lock],
    X: ["Separate authorization codes required to add, drop, or change", KeyRound],
};

const SHORT_LABELS = {A: "Prerequisite", B: "Authorization", L: "Major only", X: "Authorization"};

export default function RestrictionBadges({flags}) {
    const id = useId();
    if (!flags.length) return null;
    return (
        <div className="restriction-badges">
            {flags.map(({code, sectionCodes}) => {
                const [label, Icon] = RESTRICTIONS[code] ?? [`Restriction ${code}. Check WebSoc for details`, Lock];
                const description = sectionCodes.length ? `${label} in sections ${sectionCodes.join(", ")}` : label;
                return (
                    <span key={code} className="restriction-badge">
                        <button type="button" className={SHORT_LABELS[code] ? "restriction-with-label" : undefined} aria-label={label} aria-describedby={sectionCodes.length ? `${id}-${code}` : undefined}>
                            <Icon size={15} aria-hidden="true" />
                            {SHORT_LABELS[code] && <span>{SHORT_LABELS[code]}</span>}
                        </button>
                        <span className="restriction-tooltip" id={`${id}-${code}`} role="tooltip">{description}</span>
                    </span>
                );
            })}
        </div>
    );
}
