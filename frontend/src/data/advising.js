export const ADVISING_DIRECTORY = "https://academicadvising.uci.edu/offices/";
export const GRADUATE_DIRECTORY = "https://grad.uci.edu/contact-us/";

// Use public shared inboxes listed by UCI, rather than individual staff addresses.
const SOCIAL_SCIENCES = ["ANTHRO", "CHC/LAT", "COGS", "ECON", "INTL ST", "LINGUIS", "LPS", "LSCI", "POL SCI", "PSY", "PSYCH", "SOC SCI", "SOCIOL", "SPPS"];
const ENGINEERING = ["BME", "CBE", "CBEMS", "CSE", "EECS", "ENGR", "ENGRCEE", "ENGRMAE", "ENGRMSE", "MSE"];
const ARTS = ["ART", "ARTS", "DANCE", "DRAMA", "MUSIC"];

const undergraduateGroups = [
    [["I&C SCI", "COMPSCI", "IN4MATX", "GDIM", "STATS", "SWE"],
        "ICS Undergraduate Student Affairs", "ucounsel@uci.edu", "https://ics.uci.edu/academics/undergrad/contact/"],
    [SOCIAL_SCIENCES,
        "Social Sciences Peer Academic Advisors", "socscipaa@uci.edu", "https://www.undergrad.socsci.uci.edu/ssusa/paa.php"],
    [["CRM/LAW", "PP&D", "PSCI", "PSY BEH", "SOCECOL", "UPPP"],
        "Social Ecology Undergraduate Advising", "sepeer@uci.edu", "https://socialecology.uci.edu/pages/administrative-resources"],
    [["MATH", "CHEM", "EARTHSS", "PHY SCI", "PHYSICS"],
        "Physical Sciences Student Affairs", "pssazot@uci.edu", "https://ps.uci.edu/our-students/"],
    [["BIO SCI", "DEV BIO", "ECO EVO", "MOL BIO", "NEURBIO"],
        "Biological Sciences Advising", "biosciadvising@uci.edu", "https://undergraduate.bio.uci.edu/contact-us/"],
    [ENGINEERING,
        "Engineering Undergraduate Student Affairs", "ugengr@uci.edu", "https://undergraduate.eng.uci.edu/meet-the-peer-advisors/"],
    [ARTS,
        "Arts Student Affairs", "artscounselor@uci.edu", "https://www.arts.uci.edu/students/student-affairs-office"],
    [["AC ENG", "AFAM", "ARABIC", "ARMN", "ART HIS", "ASIANAM", "ASL", "CHINESE", "CLASSIC", "CLT&THY", "COM LIT", "CRITISM", "E ASIAN", "EAS", "ENGLISH", "EURO ST", "FLM&MDA", "FRENCH", "GEN&SEX", "GERMAN", "GLBL ME", "GLBLCLT", "GREEK", "HEBREW", "HISTORY", "HUMAN", "IRAN", "ITALIAN", "JAPANSE", "KOREAN", "LATIN", "LIT JRN", "MED HUM", "PERSIAN", "PHILOS", "PORTUG", "REL STD", "RUSSIAN", "SPANISH", "VIETMSE", "VIS STD", "WOMN ST", "WRITING"],
        "Humanities Undergraduate Study", "humadvising@uci.edu", "https://humanities.uci.edu/undergrad/contact-us"],
    [["EDUC"], "Education Student Affairs", "educadvising@uci.edu", ADVISING_DIRECTORY],
    [["NUR SCI"], "Nursing Student Affairs", "nssao@uci.edu", "https://appointments.web.uci.edu/OfficeContactInfo.aspx"],
    [["PHRMSCI"], "Pharmaceutical Sciences Peer Advisors", "pharmsci@uci.edu", "https://pharmsci.uci.edu/for-current-students/"],
    [["PUBHLTH", "EHS", "EPIDEM"], "Public Health Undergraduate Programs", "phuao@uci.edu", "https://publichealth.uci.edu/about/offices-staff/"],
    [["MGMT"], "Merage Undergraduate Programs", "ugprograms@merage.uci.edu", ADVISING_DIRECTORY],
];

const programGroups = [
    [["PHMD"], "PharmD Student Affairs", "pharmd@uci.edu", "https://pharmsci.uci.edu/for-current-students/student-pharmacists/information-for-incoming-student-pharmacists/"],
    [["ROTC"], "UC Irvine Army ROTC", "armyrotc@uci.edu", "https://armyrotc.due.uci.edu/staff/"],
    [["BANA"], "Master of Science in Business Analytics", "msba@merage.uci.edu", "https://merage.uci.edu/programs/masters/master-science-business-analytics/contact-us.html"],
    [["FIN"], "Master of Finance", "mfin@merage.uci.edu", "https://merage.uci.edu/programs/masters/master-finance/contact-us.html"],
    [["INNO"], "Master of Innovation and Entrepreneurship", "mie@merage.uci.edu", "https://merage.uci.edu/programs/masters/master-innovation-entrepreneurship/contact-us.html"],
    [["MPAC"], "Master of Professional Accountancy", "mpac@merage.uci.edu", "https://merage.uci.edu/programs/masters/master-professional-accountancy/contact-us.html"],
    [["MGMTMBA"], "Full-Time MBA Program", "mba@merage.uci.edu", "https://merage.uci.edu/programs/mba/full-time-mba/contact-us.html"],
    [["MGMT EP"], "Executive MBA Program", "emba@merage.uci.edu", "https://merage.uci.edu/programs/mba/executive-mba/contact-us.html"],
    [["MGMT FE"], "Flex MBA Program", "flexmba@uci.edu", "https://merage.uci.edu/contact-us/index.html"],
    [["MNGE"], "Master in Management", "mim@merage.uci.edu", "https://merage.uci.edu/contact-us/index.html"],
    [["UCDC"], "Office of Civic Engagement", "civicengagement@uci.edu", "https://civicengagement.uci.edu/ucdc/academic/"],
];

const contacts = new Map([...undergraduateGroups, ...programGroups].flatMap(([subjects, label, email, url]) =>
    subjects.map((subject) => [subject, {label, email, url}]),
));

const graduateGroups = [
    [ENGINEERING, "Engineering Graduate & Professional Studies", "gradengr@uci.edu", "https://appointments.web.uci.edu/OfficeContactInfo.aspx"],
    [SOCIAL_SCIENCES, "Social Sciences Graduate Studies", "socsci.gradinfo@uci.edu", "https://www.undergrad.socsci.uci.edu/departments.php"],
    [ARTS, "Arts Student Affairs", "artscounselor@uci.edu", "https://www.arts.uci.edu/students/student-affairs-office"],
    [["DATA"], "Master of Data Science", "mds@ics.uci.edu", "https://ics.uci.edu/academics/contact-us-graduate-sao/"],
    [["COMPSCI", "I&C SCI", "IN4MATX", "NET SYS", "STATS", "SWE"],
        "ICS Graduate Programs Office", "gcounsel@ics.uci.edu", "https://ics.uci.edu/academics/contact-us-graduate-sao/"],
    [["CRM/LAW", "PP&D", "PSCI", "PSY BEH", "PUB POL", "SOCECOL", "UPPP"],
        "Social Ecology Graduate Affairs", "sega@uci.edu", "https://socialecology.uci.edu/pages/administrative-resources"],
    [["PUBHLTH", "EHS", "EPIDEM"],
        "Public Health Graduate Programs", "phgo@uci.edu", "https://publichealth.uci.edu/about/offices-staff/"],
];

const graduateContacts = new Map(graduateGroups.flatMap(([subjects, label, email, url]) =>
    subjects.map((subject) => [subject, {label, email, url}]),
));

// Undergraduate mailboxes are scoped to undergraduate course questions.
const undergraduateOnly = new Set(undergraduateGroups.flatMap(([subjects]) => subjects));

export function departmentAdvising(department, number) {
    const subject = department?.trim().replace(/\s+/g, " ").toUpperCase();
    const numberValue = String(number ?? "").match(/\d+/)?.[0];
    const graduate = Number(numberValue) >= 200;
    if (graduate) {
        return graduateContacts.get(subject) ??
            (undergraduateOnly.has(subject) ? undefined : contacts.get(subject)) ??
            {label: "UCI Graduate Division contacts", url: GRADUATE_DIRECTORY};
    }
    return contacts.get(subject) ?? {label: "UCI advising directory", url: ADVISING_DIRECTORY};
}
