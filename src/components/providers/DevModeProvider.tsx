"use client";
import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

type DevModeContextValue = {
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  toggleLoggedIn: () => void;
};

const DevModeContext = createContext<DevModeContextValue | null>(null);

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const value = useMemo(
    () => ({
      isLoggedIn,
      setIsLoggedIn,
      toggleLoggedIn: () => setIsLoggedIn((current) => !current),
    }),
    [isLoggedIn],
  );

  return <DevModeContext.Provider value={value}>{children}</DevModeContext.Provider>;
}

export function useDevMode() {
  const context = useContext(DevModeContext);
  if (!context) {
    throw new Error("useDevMode must be used within a DevModeProvider.");
  }
  return context;
}
