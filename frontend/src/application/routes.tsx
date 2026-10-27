import type { RouteObject } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";
import { ExpensesPage } from "../pages/ExpensesPage";
import { IncomePage } from "../pages/IncomePage";
import { ReportsPage } from "../pages/ReportsPage";
import { Root } from "../pages/Root";
import { SettingsPage } from "../pages/SettingsPage";
import { navigationItems, Pages } from "./navigation";

const pageElements = {
  [Pages.DASHBOARD]: <DashboardPage />,
  [Pages.EXPENSES]: <ExpensesPage />,
  [Pages.INCOME]: <IncomePage />,
  [Pages.REPORTS]: <ReportsPage />,
  [Pages.SETTINGS]: <SettingsPage />,
};

export const routes: RouteObject[] = [
  {
    path: Pages.DASHBOARD,
    element: <Root />,
    children: navigationItems.map(({ path }) =>
      path === Pages.DASHBOARD
        ? { index: true, element: pageElements[path] }
        : { path, element: pageElements[path] },
    ),
  },
];
