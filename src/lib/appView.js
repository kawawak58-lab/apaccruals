import { createContext, useContext } from "react";

export const AppViewContext = createContext({
  activeView: "/new-accrual",
  setActiveView: () => {},
  openAccrualDetails: () => {},
  pendingAccrualControlNumber: null,
  setPendingAccrualControlNumber: () => {},
});

export function useAppView() {
  return useContext(AppViewContext);
}
