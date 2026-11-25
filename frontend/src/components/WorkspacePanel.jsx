import { useId, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, X } from "lucide-react";

const compactQuery = "(max-width: 1050px)";
function subscribeToWorkspaceWidth(listener) {
    const media = window.matchMedia(compactQuery);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
}
const isCompactWorkspace = () => window.matchMedia(compactQuery).matches;
const desktopSnapshot = () => false;

export default function WorkspacePanel({
    title, shortTitle = title, icon: Icon, className, collapsible = false, tutorialOpen, children,
}) {
    const compact = useSyncExternalStore(subscribeToWorkspaceWidth, isCompactWorkspace, desktopSnapshot);
    const [open, setOpen] = useState(true);
    const dialog = useRef(null);
    const titleId = useId();
    const contentId = useId();

    if (compact && !tutorialOpen) {
        return (
            <div className={className}>
                <button type="button" className="workspace-panel-launch" aria-haspopup="dialog"
                    onClick={() => dialog.current.showModal()}>
                    <Icon size={16} aria-hidden="true" /> {shortTitle}
                </button>
                <dialog ref={dialog} className="workspace-sheet" aria-labelledby={titleId}>
                    <div className="workspace-sheet-heading">
                        <h2 id={titleId}>{title}</h2>
                        <button type="button" aria-label={`Close ${shortTitle}`} onClick={() => dialog.current.close()}>
                            <X size={20} aria-hidden="true" />
                        </button>
                    </div>
                    {children}
                </dialog>
            </div>
        );
    }

    const expanded = open || tutorialOpen;
    return (
        <aside className={`workspace-panel ${className}`} aria-labelledby={titleId}>
            <h2 className="workspace-panel-title" id={titleId}>
                {collapsible ? (
                    <button type="button" aria-expanded={expanded} aria-controls={contentId} disabled={tutorialOpen}
                        onClick={() => setOpen((current) => !current)}>
                        <Icon size={16} aria-hidden="true" /> {title}
                        <ChevronDown size={16} className="workspace-panel-chevron" aria-hidden="true" />
                    </button>
                ) : <><Icon size={16} aria-hidden="true" /> {title}</>}
            </h2>
            <div id={contentId} hidden={collapsible && !expanded}>{children}</div>
        </aside>
    );
}
