import { test, expect } from '@playwright/test';

test.describe('Paper Manager E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set a wider viewport to ensure all panels are visible
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/dashboard');
    // Ensure styles and scripts are loaded
    await page.waitForLoadState('networkidle');
  });

  test('should load dashboard with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/서지관리/);
    // Check for TopicsTree heading (not TopBar button)
    await expect(page.getByRole('heading', { name: '라이브러리' })).toBeVisible();
  });

  test('should verify layout structure', async ({ page }) => {
    // Check for major sections in the new Resizable Panels
    await expect(page.getByRole('heading', { name: '라이브러리' })).toBeVisible();
    await expect(page.getByPlaceholder('제목, 저자 검색...')).toBeVisible();

    // Metadata panel empty state check
    await expect(page.getByText('논문을 선택하여 상세 정보를 확인하세요')).toBeVisible();
  });

  test('should have TopBar with panel controls', async ({ page }) => {
    // Check TopBar panel toggle buttons (use exact: true for PDF to avoid matching "PDF 추가")
    await expect(page.getByRole('button', { name: /라이브러리/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /논문목록/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PDF', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /메타데이터/i })).toBeVisible();
  });

  test('should have search button in TopBar', async ({ page }) => {
    // Check search button exists
    await expect(page.getByRole('button', { name: /논문 검색/i })).toBeVisible();
  });

  test('should toggle library panel visibility', async ({ page }) => {
    // Find the TopicsTree panel heading
    const topicsHeading = page.getByRole('heading', { name: '라이브러리' });
    await expect(topicsHeading).toBeVisible();

    const toggleButton = page.getByRole('button', { name: /라이브러리/i });

    // When panel is visible, button should have active styling (text-stone-700)
    await expect(toggleButton).toHaveClass(/text-stone-700/);

    // Toggle left panel off using the 라이브러리 button
    await toggleButton.click();

    // Wait for state change - button should now have inactive styling (text-stone-400)
    await expect(toggleButton).toHaveClass(/text-stone-400/, { timeout: 3000 });

    // Toggle back on
    await toggleButton.click();

    // Button should be active again
    await expect(toggleButton).toHaveClass(/text-stone-700/, { timeout: 3000 });
  });

  test('should have paper list with search input', async ({ page }) => {
    // Check paper list search input
    await expect(page.getByPlaceholder('제목, 저자 검색...')).toBeVisible();
  });

  test('should show metadata panel placeholder when no paper selected', async ({ page }) => {
    // Check metadata panel shows placeholder
    await expect(page.getByText('논문을 선택하여 상세 정보를 확인하세요')).toBeVisible();
  });

  test('should navigate to table view', async ({ page }) => {
    // Click table view link
    await page.getByRole('link', { name: /테이블 뷰/i }).click();
    await expect(page).toHaveURL(/\/table/);
  });

  test('should open search dialog when clicking search button', async ({ page }) => {
    // Click search button
    await page.getByRole('button', { name: /논문 검색/i }).click();

    // Verify dialog opens
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Search Academic Papers')).toBeVisible();
  });
});
