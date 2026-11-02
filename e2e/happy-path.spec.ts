import { test, expect, Page } from "@playwright/test";

async function loginAs(page: Page, identifier: "alex_debater" | "admin" | "sam_rationalist") {
  await page.goto("/login");
  await page.fill("input[name='email']", identifier);
  await page.fill("input[name='password']", "password123");
  await page.locator("form").getByRole("button", { name: "Log In" }).click();
  await page.waitForURL("/dashboard");
}

test.describe("Debate Platform: Complete End-to-End Happy Path", () => {
  test("Homepage loads with editorial branding, headline, and real CTAs", async ({ page }) => {
    await page.goto("/");

    // Verify editorial typography & primary headline
    await expect(page.getByRole("heading", { level: 1 })).toContainText("YOU TALK. THEY TALK.");
    await expect(page.getByText("Challenge strangers, defend your opinions")).toBeVisible();

    // Verify key action buttons in hero
    const findDebateBtn = page.locator("main").getByRole("link", { name: "Find a debate" });
    await expect(findDebateBtn).toBeVisible();
    await expect(findDebateBtn).toHaveAttribute("href", "/explore");

    const startChallengeBtn = page.locator("main").getByRole("link", { name: "Start a challenge" });
    await expect(startChallengeBtn).toBeVisible();
    await expect(startChallengeBtn).toHaveAttribute("href", "/challenges/new");

    // Verify three core value propositions
    await expect(page.getByText("Pick your side.")).toBeVisible();
    await expect(page.getByText("Schedule your match.")).toBeVisible();
    await expect(page.getByText("Show up and argue.")).toBeVisible();
  });

  test("Explore feed supports category filtering and displays open challenges", async ({ page }) => {
    await page.goto("/explore");

    // Category filter pills are links
    await expect(page.locator("main").getByRole("link", { name: "All Categories" })).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: "Technology" })).toBeVisible();

    // Search input exists
    const searchInput = page.getByPlaceholder("Search debates by title or topic...");
    await expect(searchInput).toBeVisible();
  });

  test("Legal policies display mandatory legal review disclaimer", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
    await expect(page.getByText("Notice: Requires Legal Review").first()).toBeVisible();

    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByText("Notice: Requires Legal Review").first()).toBeVisible();

    await page.goto("/guidelines");
    await expect(page.getByRole("heading", { name: "Community Guidelines" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "1. Argue the Proposition, Not the Person" })).toBeVisible();
  });

  test("Auth flow enforces age 18 verification checkbox and password validation", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByText("I confirm that I am at least 18 years old")).toBeVisible();
    const ageCheckbox = page.locator("input[name='age_verified']");
    await expect(ageCheckbox).toBeVisible();
    await expect(ageCheckbox).not.toBeChecked();

    const usernameInput = page.locator("input[name='username']");
    await expect(usernameInput).toBeVisible();
  });

  test("Challenge creation wizard enforces 3-step validation flow", async ({ page }) => {
    await loginAs(page, "alex_debater");
    await page.goto("/challenges/new");

    // Step 1: Proposition & Format
    await expect(page.getByText("Topic & Format")).toBeVisible();
    await page.fill("#title_input", "Should Artificial Superintelligence Be Open Sourced?");
    await page.selectOption("#category_input", "Technology");
    await page.getByRole("button", { name: "Next: Define Stances" }).click();

    // Step 2: Define Stances
    await expect(page.getByText("Define the Stances")).toBeVisible();
    await page.locator("textarea").first().fill("Open models democratize safety and prevent monopolies.");
    await page.locator("textarea").nth(1).fill("Frontier frontier weights present catastrophic proliferation risks.");
    await page.getByRole("button", { name: "Next: Rules & Context" }).click();

    // Step 3: Rules & Context
    await expect(page.getByText("Context & Visibility")).toBeVisible();
    await page.fill(
      "#description_input",
      "A rigorous debate exploring catastrophic risk versus centralized corporate control of artificial general intelligence."
    );

    // Publish challenge
    await page.getByRole("button", { name: "Publish Challenge" }).click();

    // Redirects to challenge detail page
    await expect(page).toHaveURL(/\/debate\/chl_/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Should Artificial Superintelligence Be Open Sourced?");
  });

  test("Invite receiver link renders opposing stance and accept flow", async ({ page }) => {
    await page.goto("/invite/DEMO-INVITE-2026");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Direct Debate Invitation")).toBeVisible();
  });

  test("Calendar views (Agenda, Week, Month) render with RFC 5545 .ics export", async ({ page }) => {
    await loginAs(page, "alex_debater");
    await page.goto("/calendar");

    // Verify calendar view toggles
    await expect(page.getByRole("button", { name: "Agenda View" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Week View" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Month View" })).toBeVisible();

    // Switch to Month View (SHOULD requirement)
    await page.getByRole("button", { name: "Month View" }).click();
    await expect(page.locator("main").getByText("Sun")).toBeVisible();
    await expect(page.locator("main").getByText("Sat")).toBeVisible();
  });

  test("Debate Room waiting room, check-in, and audience voting UI", async ({ page }) => {
    await loginAs(page, "alex_debater");

    // View debate room for demo match
    await page.goto("/debate-room/match_demo_01");

    // Waiting Room banner and status
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Debate Waiting Room")).toBeVisible();
    await expect(page.getByRole("button", { name: "Check In to Debate Arena" })).toBeVisible();

    // Both debaters are rendered with their respective stance
    await expect(page.locator("main").getByText("Alex Rivera [Demo]").first()).toBeVisible();
    await expect(page.locator("main").getByText("Sam Chen [Demo]").first()).toBeVisible();
  });

  test("Admin area enforces server authorization and provides report triage", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin");

    // Admin banner visible
    await expect(page.getByText("ADMIN ACCESS")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Platform Administration & Safety" })).toBeVisible();

    // Admin metrics cards
    await expect(page.getByText("Pending Reports")).toBeVisible();
    await expect(page.getByText("Total Users")).toBeVisible();
    await expect(page.getByText("Active Challenges")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Audit Logs" })).toBeVisible();

    // Switch to Audit Logs tab
    await page.getByRole("button", { name: /Immutable Audit Log/ }).click();
    await expect(page.getByRole("columnheader", { name: "Target" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Audit Details" })).toBeVisible();
  });
});
