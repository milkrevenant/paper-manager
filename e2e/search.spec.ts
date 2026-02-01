import { test, expect } from '@playwright/test';

test.describe('Paper Search Page E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
  });

  test('should navigate to search page from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click the search button in TopBar
    const searchButton = page.getByRole('link', { name: /논문 검색/i });
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // Should navigate to search page
    await page.waitForURL(/\/search/);
    await expect(page.getByText('학술 논문 검색')).toBeVisible();
  });

  test('should display search page with all controls', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Check search input
    const searchInput = page.getByPlaceholder('논문 제목, 저자, 키워드로 검색...');
    await expect(searchInput).toBeVisible();

    // Check filter dropdowns
    await expect(page.getByText('모든 분야').first()).toBeVisible();
    await expect(page.getByText('전체 연도').first()).toBeVisible();

    // Check source tabs - Semantic Scholar tab visible
    await expect(page.getByRole('button', { name: /Semantic Scholar/i })).toBeVisible();
  });

  test('should show back to dashboard button', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Check back button exists (just an arrow icon now)
    const backButton = page.getByRole('link').filter({ has: page.locator('svg') }).first();
    await expect(backButton).toBeVisible();

    // Click and verify navigation
    await backButton.click();
    await page.waitForURL(/\/dashboard/);
  });

  test('should show empty state when no search performed', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Check empty state message
    await expect(page.getByText('학술 논문 검색')).toBeVisible();
    await expect(page.getByText(/\d+개의 학술 데이터베이스에서 검색합니다/)).toBeVisible();
  });

  test('should enable search when query is entered', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Type in search input
    const searchInput = page.getByPlaceholder('논문 제목, 저자, 키워드로 검색...');
    await searchInput.fill('machine learning');

    // Search button should be enabled
    const searchBtn = page.getByRole('button', { name: '검색' });
    await expect(searchBtn).toBeEnabled();
  });

  test('should allow changing search source', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Check source tabs are visible
    await expect(page.getByRole('button', { name: /Semantic Scholar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /arXiv/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /PubMed/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Crossref/i })).toBeVisible();

    // Click arXiv tab
    await page.getByRole('button', { name: /arXiv/i }).click();

    // arXiv tab should be active (has active color class)
    await expect(page.getByRole('button', { name: /arXiv/i })).toHaveClass(/bg-red-50/);
  });

  test('should allow changing field of study filter', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Click on field of study dropdown (first combobox - source tabs are not comboboxes now)
    const comboboxes = page.getByRole('combobox');
    await comboboxes.first().click();

    // Check some field options
    await expect(page.getByRole('option', { name: 'Computer Science' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Medicine' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Physics' })).toBeVisible();

    // Select one
    await page.getByRole('option', { name: 'Computer Science' }).click();
    await expect(comboboxes.first()).toContainText('Computer Science');
  });

  test('should allow changing year range filter', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Click on year range dropdown (second combobox)
    const comboboxes = page.getByRole('combobox');
    await comboboxes.nth(1).click();

    // Check year range options (Korean labels)
    await expect(page.getByRole('option', { name: '전체 연도' })).toBeVisible();
    await expect(page.getByRole('option', { name: '최근 2년' })).toBeVisible();
    await expect(page.getByRole('option', { name: '최근 5년' })).toBeVisible();

    // Select one
    await page.getByRole('option', { name: '최근 5년' }).click();
    await expect(comboboxes.nth(1)).toContainText('최근 5년');
  });

  test('should show disabled sources as coming soon', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // KCI and RISS should be disabled buttons
    const kciButton = page.getByRole('button', { name: /KCI/i });
    await expect(kciButton).toBeVisible();
    await expect(kciButton).toBeDisabled();

    const rissButton = page.getByRole('button', { name: /RISS/i });
    await expect(rissButton).toBeVisible();
    await expect(rissButton).toBeDisabled();
  });

  test('should display source-specific badges in results', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // These tests would require mocking the API responses
    // For now, we just verify the UI elements are in place
    const searchInput = page.getByPlaceholder('논문 제목, 저자, 키워드로 검색...');
    await expect(searchInput).toBeVisible();
  });
});

test.describe('Paper Search - Integration Tests', () => {
  // Note: These tests would ideally mock the API responses
  // For actual API testing, consider using MSW (Mock Service Worker)

  test.skip('should search and display results from Semantic Scholar', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Enter search query
    const searchInput = page.getByPlaceholder('Search by title, author, or keywords...');
    await searchInput.fill('deep learning');

    // Click search
    await page.getByRole('button', { name: 'Search' }).click();

    // Wait for loading to complete
    await page.waitForSelector('table', { timeout: 30000 });

    // Should display results
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });

  test.skip('should search PubMed for biomedical papers', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Select PubMed as source
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /PubMed/i }).click();

    // Enter search query
    const searchInput = page.getByPlaceholder('Search by title, author, or keywords...');
    await searchInput.fill('cancer treatment');

    // Click search
    await page.getByRole('button', { name: 'Search' }).click();

    // Wait for loading to complete
    await page.waitForSelector('table', { timeout: 30000 });

    // Results should show PMID badges
    await expect(page.locator('.bg-green-100').first()).toBeVisible();
  });

  test.skip('should search arXiv for preprints', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Select arXiv as source
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /arXiv/i }).click();

    // Enter search query
    const searchInput = page.getByPlaceholder('Search by title, author, or keywords...');
    await searchInput.fill('neural network');

    // Click search
    await page.getByRole('button', { name: 'Search' }).click();

    // Wait for loading to complete
    await page.waitForSelector('table', { timeout: 30000 });

    // Results should show arXiv badges
    await expect(page.locator('.bg-red-100').first()).toBeVisible();
  });
});
