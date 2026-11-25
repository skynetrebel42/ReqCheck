import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyProfile, loadProfile, PALETTES, saveProfile } from "./profile.js";
import { readJSON, writeJSON } from "../storage/localStore.js";

test("academic details and all palettes persist, and resetting affects only the profile", (t) => {
    const storage = new Map();
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: {
            getItem: (key) => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value),
        },
    });
    t.after(() => {
        if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
        else delete globalThis.localStorage;
    });
    assert.deepEqual(loadProfile(), emptyProfile());
    const tracker = [["MATH2A", "MATH 2A"]];
    writeJSON("antieligible.completedCourses.v1", tracker);
    const planner = {years: []};
    const bookmarks = [["MATH2A", {id: "MATH2A"}]];
    writeJSON("antieligible.plan.v1", planner);
    writeJSON("antieligible.savedCourses.v1", bookmarks);
    for (const {id: palette} of PALETTES) {
        const profile = {year: "Fourth year", graduation: "2027-06", major: "Example Major", minors: "Minor A, Minor B", palette};
        saveProfile(profile);
        assert.deepEqual(loadProfile(), profile);
    }
    saveProfile(emptyProfile());
    assert.deepEqual(loadProfile(), emptyProfile());
    assert.deepEqual(readJSON("antieligible.completedCourses.v1", []), tracker);
    assert.deepEqual(readJSON("antieligible.plan.v1", null), planner);
    assert.deepEqual(readJSON("antieligible.savedCourses.v1", null), bookmarks);

    saveProfile({year: "Unknown", graduation: "2027-99", major: [], minors: null, palette: "unknown"});
    assert.deepEqual(loadProfile(), emptyProfile());
});
