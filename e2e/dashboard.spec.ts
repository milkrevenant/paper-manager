import { test, expect } from '@playwright/test';

test.describe('Paper Manager E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    // Ensure styles and scripts are loaded
    await page.waitForLoadState('networkidle');
  });

  test('should load dashboard with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/서지관리/);
    // Header is removed, so we check for sidebars instead
    await expect(page.getByText('라이브러리', { exact: true })).toBeVisible();
  });

  test('should verify layout structure', async ({ page }) => {
    // Check for major sections in the new Resizable Panels
    await expect(page.getByText('논문 목록', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('논문 검색...')).toBeVisible();
    
    // Metadata panel empty state check
    await expect(page.getByText('논문을 선택하여 상세 정보를 확인하세요')).toBeVisible();
  });

  test('should selection logic and unified metadata panel', async ({ page }) => {
    // 1. Select a paper from the list (using the hardcoded items)
    const paperRow = page.locator('div').filter({ hasText: 'Deep Learning Approaches' }).first();
    await paperRow.click();

    // 2. Verify Unified Metadata Panel Loads
    // Check for input fields instead of static text
    const titleInput = page.getByPlaceholder('논문 제목');
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue(/Deep Learning Approaches/);

    // 3. Verify AI Section visibility (Editable Form)
    await expect(page.getByText('1. Research Design')).toBeVisible();
    await expect(page.getByPlaceholder('연구 목적 입력').first()).toBeVisible();
    
    // Verify Toggles
    await expect(page.getByText('Qualitative')).toBeVisible();
    await expect(page.getByText('Quantitative')).toBeVisible();

    // 4. Verify Notes Section
    await expect(page.getByPlaceholder('여기에 연구 메모를 작성하세요...')).toBeVisible();
  });

  test('should trigger auto-save on edit', async ({ page }) => {
    // 1. Select paper
    await page.locator('div').filter({ hasText: 'Deep Learning Approaches' }).first().click();

    // 2. Edit Title
    const titleInput = page.locator('textarea').first();
    await titleInput.fill('Updated E2E Test Title');

    // 3. Verify Auto-Save Indicator "Saving..." appears
    await expect(page.getByText('Saving...')).toBeVisible();
  });
});
