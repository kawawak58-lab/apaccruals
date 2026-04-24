import { createContext, useContext } from "react";

export const AppViewContext = createContext({
  activeView: "/new-accrual",
  setActiveView: () => {},
});

export function useAppView() {
  return useContext(AppViewContext);
}
