import axios from "axios";
import { useEffect, useState } from "react";

export function useCourseSections(courseId, termId) {
    const [result, setResult] = useState(null);
    const [attempt, setAttempt] = useState(0);
    const requestKey = `${courseId}|${termId}|${attempt}`;

    useEffect(() => {
        const controller = new AbortController();
        axios.get(`/api/sections/${termId}/${encodeURIComponent(courseId)}`, {
            signal: controller.signal,
            timeout: 10000,
        }).then(({data}) => {
            if (!controller.signal.aborted) {
                setResult({key: requestKey, sections: Array.isArray(data?.sections) ? data.sections : false});
            }
        }).catch(() => {
            if (!controller.signal.aborted) setResult({key: requestKey, sections: false});
        });
        return () => controller.abort();
    }, [courseId, termId, requestKey]);

    return {
        sections: result?.key === requestKey ? result.sections : null,
        retry: () => setAttempt((current) => current + 1),
    };
}
