import { Search } from "lucide-react";
import axios from "axios";
import { useState, useEffect, useId, useRef } from "react";
import { useTutorialActions } from "./TutorialActionContext";
import "../styles/SearchBar.css";

// Search bar with dropdown of courses
// When user clicks a class, calls onCourseChosen(course), course is object from /api/search
export default function SearchBar({ onCourseChosen, onCourseDragStart, tourTarget = "course-search-input", tourContainerTarget, tourResultTarget, tourContext = "graph" }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const listId = useId();
  const listOpen = open && Boolean(search.trim());
  const activeOption = listOpen && activeIndex >= 0 ? results[activeIndex] : undefined;
  const resultsRef = useRef(null);
  const pointerDownOnResult = useRef(false);
  const dragging = useRef(false);
  const { reportTutorialAction } = useTutorialActions();

  // Check where cursor was released and if the cursor was being dragged, if good then close the drop down search menu
  useEffect(() => {
    function handleWindowPointerUp(event) {
      if (!pointerDownOnResult.current) {
        return;
      }
      if (resultsRef.current?.contains(event.target)) {
        return;
      }
      pointerDownOnResult.current = false;
      if (!dragging.current) {
        setOpen(false);
      }
    }

    window.addEventListener("pointerup", handleWindowPointerUp);
    return () => window.removeEventListener("pointerup", handleWindowPointerUp);
  }, []);

  // Runs when text changes, has 200ms delay
  useEffect(() => {
    let q = search.trim();
    if (!q) {
      return;
    }

    let controller = new AbortController();
    let timer = setTimeout(async () => {
      try {
        const response = await axios.get("/api/search", {
          params: { q },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setResults(response.data);
        setActiveIndex(-1);
        setLoading(false);
        reportTutorialAction("search-results-loaded", {
          context: tourContext,
          normalizedQuery: normalizeCourseQuery(q),
          courseIds: response.data.map((course) => course.id),
        });
      } catch (e) {
        if (!axios.isCancel(e)) {
          setLoading(false);
          console.error("Search failed: ", e);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, reportTutorialAction, tourContext]);

  function handleChange(event) {
    const text = event.target.value;
    setSearch(text);
    setResults([]);
    setActiveIndex(-1);
    setOpen(true);
    setLoading(Boolean(text.trim()));
    reportTutorialAction("search-query-entered", {
      context: tourContext,
      normalizedQuery: normalizeCourseQuery(text),
    });

  }

  function choose(course) {
    setSearch("");
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
    onCourseChosen(course);
  }

  function handleKeyDown(event) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape" && listOpen) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && search.trim()) {
      event.preventDefault();
      setOpen(true);
      if (!results.length) return;
      const next = event.key === "ArrowDown"
        ? (activeIndex + 1) % results.length
        : (activeIndex <= 0 ? results.length - 1 : activeIndex - 1);
      setActiveIndex(next);
      resultsRef.current?.children[next]?.scrollIntoView({block: "nearest"});
    }
    if (event.key === "Enter" && activeOption) {
      event.preventDefault();
      choose(activeOption);
    }
  }

  return (
    <div className="search" data-tour={tourContainerTarget}>
      <Search className="search-icon" size={17} aria-hidden="true" />
      <input
        type="text"
        role="combobox"
        aria-label="Search classes"
        aria-autocomplete="list"
        aria-expanded={listOpen}
        aria-controls={listOpen ? listId : undefined}
        aria-activedescendant={activeOption ? `${listId}-${activeIndex}` : undefined}
        data-tour={tourTarget}
        placeholder="Search classes"
        value={search}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          const focusMovingIntoTutorial = event.relatedTarget?.closest?.(".tutorial-card");
          window.setTimeout(() => {
            const tutorialHasFocus =
              tourContext === "planner" &&
              (focusMovingIntoTutorial || document.activeElement?.closest?.(".tutorial-card"));
            if (!pointerDownOnResult.current && !dragging.current && !tutorialHasFocus) {
              setOpen(false);
              setActiveIndex(-1);
            }
          }, 0);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      {listOpen && (
        <ul id={listId} role="listbox" aria-label="Course suggestions" className="search-results" ref={resultsRef}>
          {results.length === 0 && (
            <li role="option" aria-disabled="true" className="search-empty">{loading ? "Searching…" : "No courses found"}</li>
          )}
          {results.map((course, index) => (
            <li
              key={course.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              data-tour={tourResultTarget}
              onMouseDown={() => pointerDownOnResult.current = true}
              draggable={Boolean(onCourseDragStart)}
              onMouseUp={() => pointerDownOnResult.current = false}
              onClick={() => choose(course)}
              onDragStart={(event) => {
                if (!onCourseDragStart) {
                  return
                }
                dragging.current = true;
                onCourseDragStart(event, course);
              }}
              onDragEnd={() => {
                dragging.current = false;
                pointerDownOnResult.current = false;
                setOpen(false);
                setActiveIndex(-1);
              }}
              title={onCourseDragStart ? "Click to view, or drag into a quarter to add" : undefined}
            >
              <strong>
                {course.department} {course.course_number}
              </strong>
              <span>{course.title}</span>
            </li>
          ))}
        </ul>
      )}
      <a className="search-attribution" href="https://icssc.link/about-anteaterapi"
        target="_blank" rel="noopener noreferrer">Courses from Anteater API</a>
    </div>
  );
}

function normalizeCourseQuery(value) {
  return String(value ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();
}