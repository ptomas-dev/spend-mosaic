export enum Pages {
  DASHBOARD = "/",
  EXPENSES = "/expenses",
  INCOME = "/income",
  REPORTS = "/reports",
  SETTINGS = "/settings",
}

export const navigationItems = [
  { path: Pages.DASHBOARD, label: "Dashboard", end: true },
  { path: Pages.EXPENSES, label: "Expenses", end: false },
  { path: Pages.INCOME, label: "Income", end: false },
  { path: Pages.REPORTS, label: "Reports", end: false },
  { path: Pages.SETTINGS, label: "Settings", end: false },
];
