// Upper-division courses in the 2026–27 UCI Catalogue subject listings.
const ELECTIVES_BY_SUBJECT = {
    IN4MATX: "132 133 134 143 148 151 153 162 163 164 171 172 173 174 190 191A 191B H198 199",
    SWE: "113 115 117 119 121 122 124 141",
};

function course(subject, number) {
    return {id: `${subject.replaceAll(" ", "")}${number}`, label: `${subject} ${number}`};
}

const required = [
    course("I&C SCI", "33"),
    course("SWE", "43"),
    course("IN4MATX", "131"),
    course("IN4MATX", "161"),
];
const options = ["31", "32", "H32"].map((number) => course("I&C SCI", number));
const electives = Object.entries(ELECTIVES_BY_SUBJECT).flatMap(([subject, numbers]) =>
    numbers.split(" ").map((number) => course(subject, number))
);

export const INFORMATICS_MINOR = {
    id: "informatics-minor-2026-27",
    name: "Informatics minor",
    year: "2026–27",
    catalogueUrl: "https://catalogue.uci.edu/donaldbrenschoolofinformationandcomputersciences/departmentofinformatics/informatics_minor/",
    required,
    options,
    electives,
    courseTypes: new Map([
        ...required.map(({id}) => [id, "Required"]),
        ...options.map(({id}) => [id, "Programming option"]),
        ...electives.map(({id}) => [id, "Elective"]),
    ]),
};
