import { useState } from "react";
import { Palette, RotateCcw, UserRound } from "lucide-react";
import { emptyProfile, PALETTES, YEAR_OPTIONS } from "../profile/profile";
import ConfirmDialog from "./ConfirmDialog";
import "../styles/Profile.css";

export default function Profile({profile, onSave}) {
    const [draft, setDraft] = useState(profile);
    const [feedback, setFeedback] = useState("");
    const [resetOpen, setResetOpen] = useState(false);

    function edit(field, value) {
        setDraft((current) => ({...current, [field]: value}));
        setFeedback("");
    }

    function handleSave(event) {
        event.preventDefault();
        const next = {...draft, major: draft.major.trim(), minors: draft.minors.trim()};
        onSave(next);
        setDraft(next);
        setFeedback("Profile saved.");
    }

    function reset() {
        const defaults = emptyProfile();
        onSave(defaults);
        setDraft(defaults);
        setResetOpen(false);
        setFeedback("Profile reset.");
    }

    return (
        <main className="profile-page">
            <header className="profile-heading">
                <h1>Profile</h1>
                <p>Your profile and color preferences are stored in this browser.</p>
            </header>
            <form onSubmit={handleSave}>
                <div className="profile-panels">
                    <section className="workspace-panel profile-card" aria-labelledby="academic-profile">
                        <h2 id="academic-profile"><UserRound size={20} aria-hidden="true" /> Academic details</h2>
                        <div className="profile-fields">
                            <label>Your year
                                <select value={draft.year} onChange={(event) => edit("year", event.target.value)}>
                                    <option value="">Choose your year</option>
                                    {YEAR_OPTIONS.map((year) => <option key={year}>{year}</option>)}
                                </select>
                            </label>
                            <label>Intended graduation
                                <input type="month" value={draft.graduation} onChange={(event) => edit("graduation", event.target.value)} />
                            </label>
                            <label>Major
                                <input value={draft.major} maxLength={100} onChange={(event) => edit("major", event.target.value)} />
                            </label>
                            <label>Minors
                                <input value={draft.minors} maxLength={240} onChange={(event) => edit("minors", event.target.value)}
                                    aria-describedby="profile-minors-help" />
                                <small id="profile-minors-help">Separate multiple minors with commas.</small>
                            </label>
                        </div>
                    </section>
                    <fieldset className="workspace-panel profile-card">
                        <legend className="profile-visually-hidden">Color palette</legend>
                        <h2><Palette size={20} aria-hidden="true" /> Color palette</h2>
                        <div className="profile-palettes">
                            {PALETTES.map(({id, name, swatches}) => (
                                <label className="profile-palette" key={id}>
                                    <input type="radio" name="palette" value={id} checked={draft.palette === id}
                                        onChange={() => edit("palette", id)} />
                                    <span>{name}</span>
                                    <span className="profile-swatches" aria-hidden="true">
                                        {swatches.map((color) => <i key={color} style={{backgroundColor: color}} />)}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                </div>
                <div className="profile-actions">
                    <button type="submit" className="profile-save">Save profile</button>
                    <button type="button" className="profile-reset" onClick={() => setResetOpen(true)}>
                        <RotateCcw size={15} aria-hidden="true" /> Reset profile
                    </button>
                    <span role="status">{feedback}</span>
                </div>
            </form>
            <ConfirmDialog open={resetOpen} title="Reset your profile?"
                message="This clears your academic details and restores UCI Blue & Gold. Your course history, Planner, and bookmarks are kept."
                confirmLabel="Reset profile" onConfirm={reset} onCancel={() => setResetOpen(false)} />
        </main>
    );
}
