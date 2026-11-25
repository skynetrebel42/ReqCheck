import "@xyflow/react/dist/style.css";
import "./App.css";
import Header from "./components/Header";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import CoursePlanner from "./components/CoursePlanner";
import SavedCourses from "./components/SavedCourses";
import Profile from "./components/Profile";
import Sources from "./components/Sources";
import Welcome from "./components/Welcome";
import { loadProfile, saveProfile } from "./profile/profile";
import { PlanningContext } from "./planner/PlanningContext";
import { emptyPlan, QUARTERS } from "./planner/plan";
import { readJSON, writeJSON } from "./storage/localStore";
import MainWorkspace from "./components/MainWorkspace";
import SideBarProgressTracker from "./components/SidebarProgressTracker";
import { useState, useCallback, useEffect, useRef } from "react";
import TutorialGuide from "./components/TutorialGuide";
import TipsPanel from "./components/TipsPanel";
import { TutorialActionProvider } from "./components/TutorialActionContext";
import usePersistentMap from "./hooks/usePersistentMap";
import { loadSavedGraph } from "./storage/graphStorage";
import { addReviewedCourses } from "./progress/transcriptImport";

// Bump the version when the saved shape changes, so old data is ignored
const COMPLETED_COURSES_KEY = "antieligible.completedCourses.v1";
const INPROGRESS_COURSES_KEY = "antieligible.inprogressCourses.v1";

const SATISFIED_EXAMS_KEY = "antieligible.satisfiedExams.v1";

function readLegacyExamMarks() {
  return (loadSavedGraph()?.nodes ?? [])
    .filter((node) => node.type === "infoNode" && node.data?.kind === "exam" && node.data.satisfied)
    .map((node) => [node.id, true]);
}

const PLAN_KEY = "antieligible.plan.v1";
const SAVED_COURSES_KEY = "antieligible.savedCourses.v1";

function loadPlan() {
  const stored = readJSON(PLAN_KEY, null);
  return stored?.years?.length && Array.isArray(stored.years) &&
    stored.years.every((year) => Number.isInteger(year?.id) && QUARTERS.every((quarter) => Array.isArray(year.quarters?.[quarter])))
    ? stored : emptyPlan();
}

const TUTORIAL_COURSE_ID = "COMPSCI161";

function restoreCourseEntry(courses, entry) {
  const next = new Map(courses);
  if (entry === undefined) {
    next.delete(TUTORIAL_COURSE_ID);
  } else {
    next.set(TUTORIAL_COURSE_ID, entry);
  }
  return next;
}

function AppContent({ courseProgress, completedCourses, inprogressCourses }) {
  const {pathname} = useLocation();
  const navigate = useNavigate();
  const onWelcome = pathname === "/";
  const [savedPlan, setSavedPlan] = useState(loadPlan);
  const [profile, setProfile] = useState(loadProfile);
  useEffect(() => {
    document.documentElement.dataset.palette = profile.palette;
  }, [profile.palette]);
  const [tutorialPlan, setTutorialPlan] = useState(emptyPlan);
  const [bookmarks, setBookmarks] = usePersistentMap(SAVED_COURSES_KEY);
  useEffect(() => writeJSON(PLAN_KEY, savedPlan), [savedPlan]);

  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialPaused, setTutorialPaused] = useState(false);
  const [tutorialRun, setTutorialRun] = useState(0);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [searchWorkspaceKey, setSearchWorkspaceKey] = useState(0);
  const tutorialProgressSnapshot = useRef({
    completed: completedCourses.get(TUTORIAL_COURSE_ID),
    inprogress: inprogressCourses.get(TUTORIAL_COURSE_ID),
  });

  const pausedCourseProgress = useRef(null);

  // Restore the demo course while preserving changes to other courses.
  const restoreTutorialProgress = useCallback(() => {
    const snapshot = tutorialProgressSnapshot.current;
    if (!snapshot) return;

    courseProgress.completed.setCourses((courses) => restoreCourseEntry(courses, snapshot.completed));
    courseProgress.inprogress.setCourses((courses) => restoreCourseEntry(courses, snapshot.inprogress));
    tutorialProgressSnapshot.current = null;
    setSearchWorkspaceKey((key) => key + 1);
  }, [courseProgress.completed.setCourses, courseProgress.inprogress.setCourses]);

  const pauseTutorial = useCallback(() => {
    pausedCourseProgress.current = {
      completed: completedCourses.get(TUTORIAL_COURSE_ID),
      inprogress: inprogressCourses.get(TUTORIAL_COURSE_ID),
    };
    setTutorialPaused(true);
    setTutorialOpen(false);
  }, [completedCourses, inprogressCourses]);

  const finishTutorial = useCallback(() => {
    restoreTutorialProgress();
    setTutorialPaused(false);
    setTutorialOpen(false);
    setTutorialRun((run) => run + 1);
    setTutorialPlan(emptyPlan());
  }, [restoreTutorialProgress]);

  const startTutorial = useCallback(() => {
    const current = {
      completed: completedCourses.get(TUTORIAL_COURSE_ID),
      inprogress: inprogressCourses.get(TUTORIAL_COURSE_ID),
    };
    const paused = pausedCourseProgress.current;
    if (!tutorialPaused) setTutorialPlan(emptyPlan());
    if (!tutorialPaused || current.completed !== paused?.completed || current.inprogress !== paused?.inprogress) {
      tutorialProgressSnapshot.current = current;
    }
    setTipsOpen(false);
    if (onWelcome) navigate("/search");
    setTutorialOpen(true);
  }, [completedCourses, inprogressCourses, tutorialPaused, onWelcome, navigate]);

  function updateProfile(next) {
    setProfile(next);
    saveProfile(next);
  }

  function importCourseProgress(rows) {
    const newCourses = rows.filter(({ course }) =>
      !completedCourses.has(course.id) && !inprogressCourses.has(course.id),
    );
    if (newCourses.some((row) => row.status === "completed")) {
      courseProgress.completed.setCourses((courses) => addReviewedCourses(courses, newCourses, "completed"));
    }
    if (newCourses.some((row) => row.status === "in-progress")) {
      courseProgress.inprogress.setCourses((courses) => addReviewedCourses(courses, newCourses, "in-progress"));
    }
  }

  return (
    <PlanningContext.Provider value={{
      plan: tutorialOpen ? tutorialPlan : savedPlan,
      setPlan: tutorialOpen ? setTutorialPlan : setSavedPlan,
      bookmarks,
      setBookmarks,
    }}>
    <TutorialActionProvider>
      <>
      <div id="app-page">
        <Header
          onStartTutorial={startTutorial}
          tutorialPaused={tutorialPaused && !tutorialOpen}
          onOpenTips={() => setTipsOpen(true)}
        />
        <div id="app-body" className={onWelcome ? "welcome-layout" : undefined}>
          {!onWelcome && <SideBarProgressTracker
            completedCourses={completedCourses}
            inprogressCourses={inprogressCourses}
            onImport={importCourseProgress}
            tutorialOpen={tutorialOpen}
          />}
          <div id="main-container">
            <Routes>
              <Route
                path="/"
                element={<Welcome onStartTutorial={startTutorial} tutorialPaused={tutorialPaused} />}
              />
              <Route
                path="/search"
                element={<MainWorkspace courseProgress={courseProgress} tutorialActive={tutorialOpen} key={searchWorkspaceKey} />}
              />
              <Route path="/planner" element={<CoursePlanner courseProgress={courseProgress} />} />
              <Route path="/saved" element={<SavedCourses courseProgress={courseProgress} />} />
              <Route path="/profile" element={<Profile profile={profile} onSave={updateProfile} />} />
              <Route path="/sources" element={<Sources />} />
            </Routes>
          </div>
        </div>
      </div>

      <TutorialGuide
        key={tutorialRun}
        open={tutorialOpen}
        onExit={pauseTutorial}
        onFinish={finishTutorial}
      />
      <TipsPanel open={tipsOpen} onClose={() => setTipsOpen(false)} />
      </>
    </TutorialActionProvider>
    </PlanningContext.Provider>
  );
}

export default function App() {
  const [completedCourses, setCompletedCourses] = usePersistentMap(
    COMPLETED_COURSES_KEY,
  );
  const [inprogressCourses, setInprogressCourses] = usePersistentMap(
    INPROGRESS_COURSES_KEY,
  );

  const [satisfiedExams, setSatisfiedExams] = usePersistentMap(SATISFIED_EXAMS_KEY, readLegacyExamMarks);

  const courseProgress = {
    exams: { marks: satisfiedExams, setMarks: setSatisfiedExams },
    completed: {
      courses: completedCourses,
      setCourses: setCompletedCourses,
    },
    inprogress: {
      courses: inprogressCourses,
      setCourses: setInprogressCourses,
    },
  };
  return (
    <BrowserRouter>
      <AppContent
        courseProgress={courseProgress}
        completedCourses={completedCourses}
        inprogressCourses={inprogressCourses}
      />
    </BrowserRouter>
  );
}