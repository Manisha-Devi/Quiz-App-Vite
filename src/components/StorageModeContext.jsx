import React, { createContext, useContext, useMemo, useState } from "react";

const StorageModeContext = createContext(null);

export function StorageModeProvider({ children }) {
  const [mode, setMode] = useState("server");
  const value = useMemo(() => ({ mode, setMode }), [mode]);

  return (
    <StorageModeContext.Provider value={value}>
      {children}
    </StorageModeContext.Provider>
  );
}

export function useStorageMode() {
  const context = useContext(StorageModeContext);
  const [fallbackMode, setFallbackMode] = useState("server");

  if (context) return context;
  return { mode: fallbackMode, setMode: setFallbackMode };
}

export default StorageModeContext;
