import { expect, test } from '@playwright/test';

test('opens the menu and starts a new farm', async ({ page }) => {
  await page.goto('/');
  const menu = page.getByTestId('sitio-menu');
  await expect(menu).toBeVisible();
  await expect(page).toHaveTitle('Sítio');
  const source = page.getByTestId('sitio-source');
  await expect(source).toBeVisible();
  await expect(source).toHaveAttribute('href', 'https://github.com/gamestudio42/sitio');

  await page.getByTestId('sitio-new').click();
  await expect(menu).toBeHidden();
  await expect(page.locator('.setup-panel')).toBeVisible();
});
