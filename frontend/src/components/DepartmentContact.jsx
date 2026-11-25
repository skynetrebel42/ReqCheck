import { Link } from "react-router-dom";
import { departmentAdvising } from "../data/advising";

export default function DepartmentContact({department, number}) {
    const contact = departmentAdvising(department, number);
    const subject = encodeURIComponent(`${department} ${number} course question`);
    return (
        <div className="course-advising">
            <span>{contact.label}</span>
            {contact.email && <a href={`mailto:${contact.email}?subject=${subject}`}>{contact.email}</a>}
            <div className="course-advising-links">
                <a href={contact.url} target="_blank" rel="noopener noreferrer">
                    {contact.email ? "Verify contact" : "Find an advisor"}
                </a>
                <Link to="/sources">Sources</Link>
            </div>
        </div>
    );
}
