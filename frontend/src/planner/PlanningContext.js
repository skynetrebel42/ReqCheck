import { createContext, useContext } from "react";

export const PlanningContext = createContext(null);

export function usePlanning() {
    return useContext(PlanningContext);
}
