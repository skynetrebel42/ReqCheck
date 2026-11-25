import { BookOpen, ExternalLink } from "lucide-react";
import { ADVISING_DIRECTORY, GRADUATE_DIRECTORY } from "../data/advising";
import { GE_CATALOGUE_URL } from "../data/geCategories";
import { cerritosMathAgreement } from "../data/articulation";
import "../styles/Sources.css";

const verificationSources = [
    ["UCI General Catalogue", "https://catalogue.uci.edu/", "Course descriptions, prerequisites, and major and minor requirements."],
    ["UCI Schedule of Classes (WebSoc)", "https://www.reg.uci.edu/perl/WebSoc", "Confirm instructors, meeting times, section restrictions, and availability for the quarter you select."],
    ["UCI school advising offices", ADVISING_DIRECTORY, "Find your school’s undergraduate advising team for prerequisite or enrollment questions."],
    ["UCI Graduate Division contacts", GRADUATE_DIRECTORY, "Find the right graduate program contact for graduate courses."],
    ["ASSIST", "https://assist.org/", "Check transfer equivalents for your college and the academic year you took the course."],
    ["Cerritos College → UCI calculus pilot", cerritosMathAgreement.url, "The 2026–27 Mathematics B.S. agreement used for the two equivalents shown in ReqCheck."],
    ["UCI general education requirements", GE_CATALOGUE_URL, "Check the official breadth requirements and categories shown on Saved courses."],
    ["UCI Registrar transcript guide", "https://reg.uci.edu/services/transcripts/unofficial.html", "Find your unofficial transcript and confirm course history or grades before importing."],
];

const additionalSources = [
    ["Anteater API", "https://icssc.link/about-anteaterapi", "The student-built source ReqCheck uses for catalog and section data."],
    ["Rate My Professors", "https://www.ratemyprofessors.com/", "Student reviews. Check WebSoc for the instructor assigned to your section."],
];

function SourceList({items}) {
    return (
        <ul className="sources-list">
            {items.map(([label, href, description]) => (
                <li key={label}>
                    <a href={href} target="_blank" rel="noopener noreferrer">
                        {label} <ExternalLink size={14} aria-hidden="true" />
                    </a>
                    <p>{description}</p>
                </li>
            ))}
        </ul>
    );
}

export default function Sources() {
    return (
        <main className="sources-page">
            <h1><BookOpen size={24} aria-hidden="true" /> Sources</h1>
            <p>Use these links to verify what you see in ReqCheck.</p>
            <section className="workspace-panel" aria-labelledby="official-sources-heading">
                <h2 id="official-sources-heading">Official sources</h2>
                <SourceList items={verificationSources} />
            </section>
            <section className="workspace-panel" aria-labelledby="additional-sources-heading">
                <h2 id="additional-sources-heading">Additional sources</h2>
                <SourceList items={additionalSources} />
            </section>
        </main>
    );
}
