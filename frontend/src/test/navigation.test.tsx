import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { navigationItems, Pages } from "../application/navigation";
import { routes } from "../application/routes";
import { Sidebar } from "../components/Sidebar";
import { server } from "./server";
import { renderWithStore } from "./workflows";

function expectActiveLink(label: string) {
  const navigation = within(
    screen.getByRole("navigation", { name: "Main navigation" }),
  );
  for (const link of navigation.getAllByRole("link")) {
    if (link.textContent === label) {
      expect(link).toHaveAttribute("aria-current", "page");
      expect(link).toHaveClass("bg-secondary", "text-white");
    } else {
      expect(link).not.toHaveAttribute("aria-current");
      expect(link).not.toHaveClass("bg-secondary");
    }
  }
  expect(navigation.queryByRole("heading")).not.toBeInTheDocument();
}

function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { router, ...renderWithStore(<RouterProvider router={router} />) };
}

beforeEach(() => {
  server.use(
    http.get("http://localhost/expenses", () => HttpResponse.json([])),
    http.get("http://localhost/income", () => HttpResponse.json([])),
  );
});

describe("router-driven sidebar navigation", () => {
  it.each(navigationItems)(
    "selects $label on direct access to $path",
    ({ path, label }) => {
      const { router } = renderRoute(path);
      expect(router.state.location.pathname).toBe(path);
      expectActiveLink(label);
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        path,
      );
    },
  );

  it.each(navigationItems)(
    "keeps $label selected when remounted at the current URL",
    async ({ path, label }) => {
      const { router, unmount } = renderRoute(Pages.DASHBOARD);
      await act(async () => {
        await router.navigate(path);
      });
      const currentUrl = router.state.location.pathname;
      unmount();

      renderRoute(currentUrl);
      expectActiveLink(label);
    },
  );

  it("uses exact dashboard matching while retaining section matching", () => {
    const router = createMemoryRouter([{ path: "*", element: <Sidebar /> }], {
      initialEntries: ["/expenses/41"],
    });
    render(<RouterProvider router={router} />);
    expectActiveLink("Expenses");
  });

  it("supports tab, shift-tab and Enter on native navigation links", async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([{ path: "*", element: <Sidebar /> }], {
      initialEntries: [Pages.DASHBOARD],
    });
    render(<RouterProvider router={router} />);

    for (const { label } of navigationItems) {
      await user.tab();
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveFocus();
      expect(link).toHaveClass(
        "focus-visible:outline",
        "focus-visible:outline-2",
      );
    }
    await user.tab({ shift: true });
    expect(screen.getByRole("link", { name: "Reports" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(router.state.location.pathname).toBe(Pages.REPORTS);
    expectActiveLink("Reports");
  });

  it("updates selection on link navigation and back/forward history", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute(Pages.DASHBOARD);

    await user.click(screen.getByRole("link", { name: "Expenses" }));
    expectActiveLink("Expenses");
    await user.click(screen.getByRole("link", { name: "Income" }));
    expectActiveLink("Income");

    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe(Pages.EXPENSES);
    expectActiveLink("Expenses");
    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe(Pages.DASHBOARD);
    expectActiveLink("Dashboard");
    await act(async () => {
      await router.navigate(1);
    });
    expectActiveLink("Expenses");
    await act(async () => {
      await router.navigate(1);
    });
    expect(router.state.location.pathname).toBe(Pages.INCOME);
    expectActiveLink("Income");
  });
});
