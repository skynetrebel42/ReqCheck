import { useEffect, useState } from "react";
import { readJSON, writeJSON } from "../storage/localStore";

// A Map can't be stored as JSON directly, so it is saved as [key, value] pairs
function loadMap(storageKey, initialEntries) {
  const entries = readJSON(storageKey, null);
  return new Map(Array.isArray(entries) ? entries : initialEntries?.());
}

/**
 * Like useState(new Map()), but the Map is restored from localStorage on the
 * first render and written back every time it changes.
 * @param storageKey : localStorage key the Map is saved under
 * @returns [map, setMap], the same pair useState returns
 */
export default function usePersistentMap(storageKey, initialEntries) {
  const [map, setMap] = useState(() => loadMap(storageKey, initialEntries));

  useEffect(() => {
    writeJSON(storageKey, [...map]);
  }, [storageKey, map]);

  return [map, setMap];
}
