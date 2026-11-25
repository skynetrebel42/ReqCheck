import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import app from "./app.js";

test("course search recognizes complete and partial subject codes and preserves numbered and title matches", async (t) => {
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => new Promise((resolve, reject) => {
        server.close((err) => err ? reject(err) : resolve());
    }));

    async function search(q) {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/search?q=${encodeURIComponent(q)}`);
        assert.equal(response.status, 200);
        const results = await response.json();
        assert.ok(results.length <= 10);
        return results;
    }

    for (const [query, department] of [["in4matx", "IN4MATX"], ["I&C SCI", "I&C SCI"], ["MATH", "MATH"]]) {
        const courses = await search(query);
        assert.ok(courses.length > 0, `No courses for ${query}`);
        assert.ok(courses.every((course) => course.department === department));
    }

    for (const query of ["in4", "in4m", "in4mat"]) {
        const courses = await search(query);
        assert.equal(courses.length, 10, `Missing suggestions for ${query}`);
        assert.ok(courses.every((course) => course.department === "IN4MATX"));
    }

    assert.equal((await search("IN4MATX 151"))[0]?.id, "IN4MATX151");
    assert.equal((await search("ICS 46"))[0]?.id, "I&CSCI46");
    assert.equal((await search("151"))[0]?.course_number, "151");
    assert.ok((await search("data structure")).some(({ title }) => /data structur/i.test(title)));
    assert.deepEqual(await search(""), []);
});
