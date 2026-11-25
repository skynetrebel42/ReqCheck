import assert from "node:assert/strict";
import { test } from "node:test";
import { ADVISING_DIRECTORY, departmentAdvising, GRADUATE_DIRECTORY } from "./advising.js";

test("course advising prefers verified peer inboxes and distinguishes schools and levels", () => {
    assert.equal(departmentAdvising("SOC SCI", "10A").email, "socscipaa@uci.edu");
    assert.equal(departmentAdvising("PSCI", "104S").email, "sepeer@uci.edu");
    assert.equal(departmentAdvising("PSY", "9B").email, "socscipaa@uci.edu");
    assert.equal(departmentAdvising(" in4matx ", "151").email, "ucounsel@uci.edu");
    assert.equal(departmentAdvising("IN4MATX", "231").email, "gcounsel@ics.uci.edu");
    assert.equal(departmentAdvising("MATH", "H2A").email, "pssazot@uci.edu");
    assert.equal(departmentAdvising("PHRMSCI", "1").email, "pharmsci@uci.edu");
    assert.equal(departmentAdvising("PHMD", "201").email, "pharmd@uci.edu");
});

test("unknown subjects link to the relevant directory without a guessed address", () => {
    assert.deepEqual(departmentAdvising("UNLISTED", "123"), {
        label: "UCI advising directory", url: ADVISING_DIRECTORY,
    });
    assert.deepEqual(departmentAdvising("MATH", "205"), {
        label: "UCI Graduate Division contacts", url: GRADUATE_DIRECTORY,
    });
});
