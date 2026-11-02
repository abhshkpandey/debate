import { test, expect } from "@playwright/test";

test.describe("Security & Authentication Flow: Experienced QA Audit", () => {
  test("1. Login rejects invalid password and preserves form safety", async ({ page }) => {
    await page.goto("/login");

    await page.fill("input[name='email']", "alex_debater");
    await page.fill("input[name='password']", "wrong_hunter2_password");
    await page.locator("form").getByRole("button", { name: "Log In" }).click();

    // Verify error banner is displayed
    const errorBanner = page.locator("div").filter({ hasText: /Invalid email\/username or password/ }).first();
    await expect(errorBanner).toBeVisible();

    // Verify user remained on /login and was not authenticated
    await expect(page).toHaveURL(/\/login/);
  });

  test("2. Login rejects non-existent username with uniform error to prevent user enumeration", async ({ page }) => {
    await page.goto("/login");

    await page.fill("input[name='email']", "non_existent_target_user");
    await page.fill("input[name='password']", "password123");
    await page.locator("form").getByRole("button", { name: "Log In" }).click();

    // Generic error message prevents username enumeration
    const errorBanner = page.locator("div").filter({ hasText: /Invalid email\/username or password/ }).first();
    await expect(errorBanner).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("3. Protected route interception preserves redirect target after valid login", async ({ page }) => {
    // Unauthenticated user attempts to access /challenges/new
    await page.goto("/challenges/new");

    // Intercepted by middleware and redirected to /login with next parameter
    await expect(page).toHaveURL(/\/login\?next=%2Fchallenges%2Fnew/);

    // Enter valid credentials
    await page.fill("input[name='email']", "alex_debater");
    await page.fill("input[name='password']", "password123");
    await page.locator("form").getByRole("button", { name: "Log In" }).click();

    // Verified: successfully redirects to original intended destination /challenges/new
    await page.waitForURL(/\/challenges\/new/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Start a Challenge");
  });

  test("4. Open redirect attack vectors are safely mitigated to /dashboard", async ({ page }) => {
    // Attacker crafts malicious phishing link
    await page.goto("/login?next=https%3A%2F%2Fattacker-phishing-domain.com%2Fsteal");

    await page.fill("input[name='email']", "alex_debater");
    await page.fill("input[name='password']", "password123");
    await page.locator("form").getByRole("button", { name: "Log In" }).click();

    // Server rejects the external URL and safely redirects to /dashboard
    await page.waitForURL("/dashboard");
    await expect(page).not.toHaveURL(/attacker-phishing-domain/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");
  });

  test("5. RBAC: Standard debater is blocked from accessing /admin", async ({ page }) => {
    // Log in as standard user
    await page.goto("/login");
    await page.fill("input[name='email']", "alex_debater");
    await page.fill("input[name='password']", "password123");
    await page.locator("form").getByRole("button", { name: "Log In" }).click();
    await page.waitForURL("/dashboard");

    // Attempt direct URL access to /admin
    await page.goto("/admin");

    // Server-side requireAdmin redirects non-admin user back to /dashboard
    await page.waitForURL("/dashboard");
    await expect(page.getByText("ADMIN ACCESS")).not.toBeVisible();
  });

  test("6. RBAC: Admin account successfully accesses /admin dashboard", async ({ page }) => {
    // Log in as admin user
    await page.goto("/login");
    await page.fill("input[name='email']", "admin");
    await page.fill("input[name='password']", "password123");
    await page.locator("form").getByRole("button", { name: "Log In" }).click();
    await page.waitForURL("/dashboard");

    // Admin navigates to /admin
    await page.goto("/admin");

    await expect(page.getByText("ADMIN ACCESS")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Platform Administration & Safety" })).toBeVisible();
  });

  test("7. Full logout invalidates session cookie and terminates access", async ({ page }) => {
    // Log in
    await page.goto("/login");
    await page.fill("input[name='email']", "alex_debater");
    await page.fill("input[name='password']", "password123");
    await page.locator("form").getByRole("button", { name: "Log In" }).click();
    await page.waitForURL("/dashboard");

    // If mobile menu toggle is visible, open mobile menu to access logout button
    const mobileMenuToggle = page.getByRole("button", { name: "Toggle Navigation Menu" });
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
    }

    // Click Log out
    await page.getByRole("button", { name: "Log out" }).click();

    // Redirected to /login
    await page.waitForURL("/login");

    // Attempting to visit /dashboard should now redirect back to /login
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
  });
});
