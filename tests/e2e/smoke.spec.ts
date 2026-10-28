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
  await expect(page.getByTestId('sitio-hud')).toBeVisible();
  await expect(page.getByTestId('sitio-resource-coins')).toBeVisible();
  await expect(page.getByTestId('sitio-tutorial')).toBeVisible();
  await expect(page.getByTestId('sitio-tutorial')).toHaveAttribute('data-step', 'sede');
  await expect(page.locator('.speech-bubble')).not.toBeEmpty();

  await page.getByTestId('sitio-top-menu').click();
  await expect(page.getByTestId('sitio-menu-save')).toBeVisible();
  await expect(page.getByTestId('sitio-menu-export')).toBeVisible();
  await expect(page.getByTestId('sitio-menu-locale')).toBeVisible();
  await expect(page.getByTestId('sitio-menu-back')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('sitio-menu-save')).toBeHidden();
});
