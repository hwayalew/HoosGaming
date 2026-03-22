"use client";

import { createContext, useContext } from "react";

/** True only when Auth0Provider is mounted (secure context + env configured). */
export const Auth0SpaContext = createContext<boolean>(false);

export function useAuth0SpaActive(): boolean {
  return useContext(Auth0SpaContext);
}
