import { test, expect } from '@playwright/test';

test.describe('Table View E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/table');
    await page.waitForLoadState('networkidle');
    // Wait for the table to load
    await page.waitForSelector('table', { timeout: 10000 }).catch(() => {});
  });

  test('should load table page with correct elements', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/서지관리/);

    // Check header elements
    await expect(page.getByText('논문 메타데이터 테이블')).toBeVisible();
    await expect(page.getByRole('button', { name: /대시보드/ })).toBeVisible();

    // Wait for table to be visible
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Check table headers (default visible columns)
    await expect(page.locator('th').filter({ hasText: 'No' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: '제목' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: '저자' })).toBeVisible();
  });

  test('should display table structure correctly', async ({ page }) => {
    // Wait for table to be visible
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Check that table has proper structure (headers exist)
    await expect(page.locator('thead')).toBeVisible();
    await expect(page.locator('tbody')).toBeVisible();

    // Check footer count shows some number
    await expect(page.getByText(/총 \d+개 논문/)).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    // Wait for table to be visible
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Check search input exists and is functional
    const searchInput = page.getByPlaceholder('제목, 저자, 키워드 검색...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test search');
    await expect(searchInput).toHaveValue('test search');
  });

  test('should have sortable columns', async ({ page }) => {
    // Wait for table to be visible
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Year header should be clickable (sorting)
    const yearHeader = page.locator('th').filter({ hasText: '연도' });
    await expect(yearHeader).toBeVisible();

    // Click to sort - should not throw error
    await yearHeader.click();
  });

  test('should toggle column visibility', async ({ page }) => {
    // Wait for table to be visible
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Open column visibility dropdown
    await page.getByRole('button', { name: /열 표시/ }).click();

    // Toggle on keywords column (it's off by default)
    await page.getByRole('menuitemcheckbox', { name: '키워드' }).click();

    // Close dropdown by clicking elsewhere
    await page.keyboard.press('Escape');

    // Verify keywords column is now visible
    await expect(page.locator('th').filter({ hasText: '키워드' })).toBeVisible();
  });

  test('should show AI analyzed status column', async ({ page }) => {
    // Wait for table to be visible
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Check that AI column header exists
    await expect(page.locator('th').filter({ hasText: 'AI' })).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.getByRole('button', { name: /대시보드/ }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should have CSV export button', async ({ page }) => {
    // Check that CSV button exists
    await expect(page.getByRole('button', { name: /CSV/ })).toBeVisible();
  });
});
