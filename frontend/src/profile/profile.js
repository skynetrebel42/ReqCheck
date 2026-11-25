import { readJSON, writeJSON } from "../storage/localStore.js";

const PROFILE_KEY = "reqcheck.profile.v1";

export const PALETTES = [
    {id: "uci", name: "UCI Blue & Gold", swatches: ["#002244", "#255799", "#fecc07"]},
    {id: "matrix", name: "Matrix", swatches: ["#030704", "#145329", "#4dff79"]},
    {id: "pastel", name: "Pastel", swatches: ["#e9ddfa", "#caeae3", "#ffdbdf"]},
    {id: "psychedelic", name: "Psychedelic", swatches: ["#301269", "#ff71d3", "#65f4e2", "#edff83"]},
    {id: "rainbow", name: "Rainbow", swatches: ["#7142bf", "#d94e81", "#ffa72e", "#33b589", "#3698db"]},
];

export const YEAR_OPTIONS = ["First year", "Second year", "Third year", "Fourth year", "Fifth year or later", "Graduate student"];

export function emptyProfile() {
    return {year: "", graduation: "", major: "", minors: "", palette: "uci"};
}

export function loadProfile() {
    const saved = readJSON(PROFILE_KEY, null);
    if (!saved || typeof saved !== "object") return emptyProfile();
    return {
        year: YEAR_OPTIONS.includes(saved.year) ? saved.year : "",
        graduation: typeof saved.graduation === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(saved.graduation) ? saved.graduation : "",
        major: typeof saved.major === "string" ? saved.major.slice(0, 100) : "",
        minors: typeof saved.minors === "string" ? saved.minors.slice(0, 240) : "",
        palette: PALETTES.some(({id}) => id === saved.palette) ? saved.palette : "uci",
    };
}

export function saveProfile(profile) {
    writeJSON(PROFILE_KEY, profile);
}
