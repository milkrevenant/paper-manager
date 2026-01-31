import { test, expect } from '@playwright/test';

test.describe('Settings Dialog E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should open settings dialog when clicking settings icon', async ({ page }) => {
    // Settings icon is in the TopicsTree footer, inside the user area
    // Click on the Settings gear icon
    await page.locator('button:has(svg.lucide-settings)').click();

    // Verify dialog opens
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Settings')).toBeVisible();
  });

  test('should display General settings section', async ({ page }) => {
    // Open settings dialog
    await page.locator('button:has(svg.lucide-settings)').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Check for General section
    await expect(page.getByText('General')).toBeVisible();
    await expect(page.getByText('Default Font')).toBeVisible();
    await expect(page.getByText('Font Size')).toBeVisible();
  });

  test('should display AI Integration section', async ({ page }) => {
    // Open settings dialog
    await page.locator('button:has(svg.lucide-settings)').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Check for AI Integration section
    await expect(page.getByText('AI Integration')).toBeVisible();
    await expect(page.getByText('Gemini API Key')).toBeVisible();
    await expect(page.getByText('OpenAI API Key')).toBeVisible();
  });

  test('should display Connected Account section', async ({ page }) => {
    // Open settings dialog
    await page.locator('button:has(svg.lucide-settings)').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Check for Connected Account section
    await expect(page.getByText('Connected Account')).toBeVisible();
    await expect(page.getByRole('button', { name: /Connect Google Account/i })).toBeVisible();
  });

  test('should close settings dialog with Escape', async ({ page }) => {
    // Open settings dialog
    await page.locator('button:has(svg.lucide-settings)').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close with Escape key
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
