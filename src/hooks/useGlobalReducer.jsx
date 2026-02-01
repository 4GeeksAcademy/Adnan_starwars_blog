import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { actions, initialStore } from "../store";

const StoreContext = createContext(null);

export const StoreProvider = ({ children }) => {
  const [store, setStore] = useState(initialStore());

  const getStore = () => store;

  const value = useMemo(() => {
    const boundActions = actions(getStore, setStore);
    return { store, actions: boundActions };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  // Persist once on mount if needed (initialStore already loads)
  useEffect(() => {
    // no-op; keeping hook in case you want to expand
  }, []);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useGlobalReducer = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useGlobalReducer must be used inside StoreProvider");
  return ctx;
};
