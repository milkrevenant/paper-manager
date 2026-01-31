import { test, expect } from '@playwright/test';

test.describe('Paper Search Dialog E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should open search dialog when clicking search button', async ({ page }) => {
    // Click the search button in TopBar
    const searchButton = page.getByRole('button', { name: /논문 검색/i });
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // Verify dialog opens
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Search Academic Papers')).toBeVisible();
  });

  test('should have search input and filters', async ({ page }) => {
    // Open search dialog
    await page.getByRole('button', { name: /논문 검색/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Check search input
    const searchInput = page.getByPlaceholder('Search by title, author, or keywords...');
    await expect(searchInput).toBeVisible();

    // Check filter dropdowns (by placeholder text)
    await expect(page.getByText('Field of study')).toBeVisible();
    await expect(page.getByText('Year range')).toBeVisible();
  });

  test('should close dialog with close button', async ({ page }) => {
    // Open search dialog
    await page.getByRole('button', { name: /논문 검색/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close by pressing Escape key
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should show empty state when no search performed', async ({ page }) => {
    // Open search dialog
    await page.getByRole('button', { name: /논문 검색/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Check empty state message
    await expect(page.getByText('Enter a search query to find papers')).toBeVisible();
  });

  test('should enable search when query is entered', async ({ page }) => {
    // Open search dialog
    await page.getByRole('button', { name: /논문 검색/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Type in search input
    const searchInput = page.getByPlaceholder('Search by title, author, or keywords...');
    await searchInput.fill('machine learning');

    // Search button should be enabled
    const searchBtn = page.getByRole('button', { name: 'Search' });
    await expect(searchBtn).toBeEnabled();
  });
});
