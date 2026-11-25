import { ArrowRight, BookOpen, CalendarDays, Compass, Search, Upload, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import "../styles/Welcome.css";

const QUICK_TOUR = [
    {
        title: "Find a course",
        description: "Search by course code or title, then pick a result to open its prerequisite map.",
        icon: Search,
        to: "/search",
        action: "Search courses",
    },
    {
        title: "Check the details",
        description: "Open a course to check prerequisites, class sections, and who to contact with questions.",
        icon: BookOpen,
        to: "/sources",
        action: "See verification sources",
    },
    {
        title: "Track your progress",
        description: "Mark classes on the map or use Import course history in the Course Tracker to review and add courses from your UCI transcript.",
        icon: Upload,
        to: "/search",
        action: "Open the tracker",
    },
    {
        title: "Plan your quarters",
        description: "Bookmark courses you’re considering, or add them to a quarter in Planner.",
        icon: CalendarDays,
        to: "/planner",
        action: "Open Planner",
    },
];

export default function Welcome({onStartTutorial, tutorialPaused}) {
    return (
        <main className="welcome-page">
            <section className="welcome-hero" aria-labelledby="welcome-title">
                <div>
                    <h1 id="welcome-title">Welcome to ReqCheck</h1>
                    <p>Find courses. Get informed.<br className="welcome-hero-break" /> Stay on track.</p>
                    <div className="welcome-actions">
                        <Link className="welcome-primary" to="/search">
                            Find courses <ArrowRight size={18} aria-hidden="true" />
                        </Link>
                        <Link className="welcome-secondary" to="/profile">
                            <UserRound size={18} aria-hidden="true" /> Set up profile
                        </Link>
                    </div>
                </div>
                <img className="welcome-badge" src={`${import.meta.env.BASE_URL}images/reqcheck-badge.png`}
                    alt="" width="192" height="192" />
            </section>

            <section className="welcome-tour" aria-labelledby="quick-tour-title">
                <h2 id="quick-tour-title">Quick tour</h2>
                <ol className="welcome-tour-list">
                    {QUICK_TOUR.map(({title, description, icon: Icon, to, action}) => (
                        <li key={title} className="workspace-panel welcome-step">
                            <Icon size={21} className="welcome-step-icon" aria-hidden="true" />
                            <h3>{title}</h3>
                            <p>{description}</p>
                            <Link to={to}>{action} <ArrowRight size={15} aria-hidden="true" /></Link>
                        </li>
                    ))}
                </ol>
            </section>

            <section className="welcome-guided" aria-labelledby="guided-tour-title">
                <div>
                    <h2 id="guided-tour-title">Want to try it with a guide?</h2>
                    <p>Follow the full interactive walkthrough of Search, the prerequisite map, and Planner.</p>
                </div>
                <button className="welcome-guided-button" type="button" onClick={onStartTutorial}>
                    <Compass size={18} aria-hidden="true" /> {tutorialPaused ? "Resume tutorial" : "Start full tutorial"}
                </button>
            </section>
        </main>
    );
}
