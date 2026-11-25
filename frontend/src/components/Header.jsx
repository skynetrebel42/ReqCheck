import { BookOpen, Bookmark, CalendarDays, CircleHelp, Lightbulb, Search, UserRound } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useTutorialActions } from "./TutorialActionContext";
import "../styles/Header.css";

export default function Header({ onStartTutorial, onOpenTips, tutorialPaused }) {
    const { reportTutorialAction } = useTutorialActions();
    const reportTab = (tab) => reportTutorialAction("workspace-tab-opened", { tab });
    return (
        <header id="header">
            <Link to="/" id="logo-app-name-container" aria-label="ReqCheck home">
                <img id="logo" src={`${import.meta.env.BASE_URL}images/reqcheck-badge.png`} alt="" width="46" height="46" />
                <span id="app-name">ReqCheck</span>
            </Link>
            <nav id="nav-bar" data-tour="app-tabs" aria-label="Workspaces">
                <NavLink to="/search" className="nav-item" data-tour="search-tab" onClick={() => reportTab("search")}>
                    <Search size={16} aria-hidden="true" /> Search
                </NavLink>
                <NavLink to="/planner" className="nav-item" data-tour="planner-tab" onClick={() => reportTab("planner")}>
                    <CalendarDays size={16} aria-hidden="true" /> Planner
                </NavLink>
                <NavLink to="/saved" className="nav-item">
                    <Bookmark size={16} aria-hidden="true" /> Saved
                </NavLink>
                <NavLink to="/profile" className="nav-item">
                    <UserRound size={16} aria-hidden="true" /> Profile
                </NavLink>
            </nav>
            <div className="header-help">
                <NavLink to="/sources" className="nav-item nav-source">
                    <BookOpen size={16} aria-hidden="true" /> Sources
                </NavLink>
                <button className="nav-item nav-action" type="button" onClick={onStartTutorial}>
                    <CircleHelp size={16} aria-hidden="true" /> {tutorialPaused ? "Resume tutorial" : "Tutorial"}
                </button>
                <button className="nav-item nav-action" type="button" onClick={onOpenTips}>
                    <Lightbulb size={16} aria-hidden="true" /> Tips
                </button>
            </div>
        </header>
    );
}
