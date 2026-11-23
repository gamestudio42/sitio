import { expect, test, type Locator } from '@playwright/test';

async function heightOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  return box?.height ?? 0;
}

async function insideViewport(locator: Locator, height: number): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(height + 1);
}

test('desktop keeps hover copy and compact buttons', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('sitio-menu')).toBeVisible();
  expect(await heightOf(page.getByTestId('sitio-new'))).toBeLessThan(44);
  expect(await heightOf(page.locator('.menu-card .file-button'))).toBeLessThan(44);
  expect(await heightOf(page.locator('.locale-trigger'))).toBeLessThan(44);
  await page.getByTestId('sitio-new').click();
  const status = page.getByTestId('sitio-setup-status');
  await expect(status).toBeVisible();
  await expect(status).not.toContainText('Tap the map');
  await expect(status).not.toContainText('Toque no mapa');
  expect(await heightOf(page.getByTestId('sitio-setup-confirm'))).toBeLessThan(44);
});

test('touch can pan, pinch, and confirm a tapped placement', async ({ browser }) => {
  test.setTimeout(180_000);
  const viewports = [
    { width: 360, height: 740 },
    { width: 412, height: 915 },
    { width: 915, height: 412 },
    { width: 820, height: 1180 },
    { width: 1180, height: 820 },
  ];

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport,
      hasTouch: true,
      isMobile: true,
      locale: 'pt-BR',
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByTestId('sitio-menu')).toBeVisible();
    expect(await heightOf(page.getByTestId('sitio-new'))).toBeGreaterThanOrEqual(44);
    expect(await heightOf(page.locator('.menu-card .file-button'))).toBeGreaterThanOrEqual(44);
    expect(await heightOf(page.locator('.locale-trigger'))).toBeGreaterThanOrEqual(44);
    await page.getByTestId('sitio-new').click();
    await expect(page.getByTestId('sitio-setup-status')).toContainText('Toque no mapa');
    await insideViewport(page.getByTestId('sitio-setup-confirm'), viewport.height);
    await insideViewport(page.getByTestId('sitio-setup-cancel'), viewport.height);

    if (viewport.width === 915 && viewport.height === 412) {
      const dragged = await page.evaluate(async () => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return 'missing';
        const rect = canvas.getBoundingClientRect();
        let point: { x: number; y: number } | null = null;
        for (let y = 20; y < rect.height - 20 && !point; y += 24) {
          for (let x = 20; x < rect.width - 20; x += 24) {
            if (document.elementFromPoint(rect.left + x, rect.top + y) === canvas) {
              point = { x: rect.left + x, y: rect.top + y };
              break;
            }
          }
        }
        if (!point) return 'covered';
        const fire = (type: string, x: number, y: number, id = 1, buttons = 1) => {
          canvas.dispatchEvent(
            new PointerEvent(type, {
              pointerId: id,
              pointerType: 'touch',
              clientX: x,
              clientY: y,
              bubbles: true,
              cancelable: true,
              button: 0,
              buttons,
              isPrimary: true,
            }),
          );
        };
        fire('pointerdown', point.x, point.y);
        fire('pointermove', point.x + 80, point.y + 36);
        fire('pointerup', point.x + 80, point.y + 36, 1, 0);
        fire('pointerdown', point.x, point.y, 1);
        fire('pointerdown', point.x + 48, point.y, 2);
        fire('pointermove', point.x - 36, point.y, 1);
        fire('pointermove', point.x + 110, point.y, 2);
        fire('pointerup', point.x - 36, point.y, 1, 0);
        fire('pointerup', point.x + 110, point.y, 2, 0);
        const status =
          document.querySelector('[data-testid="sitio-setup-status"]')?.textContent ?? '';
        const placed = status.includes('Toque no mapa') ? 'open' : 'placed';
        if (placed === 'placed') return placed;
        const free: { x: number; y: number }[] = [];
        for (let y = 16; y < rect.height - 16; y += 22) {
          for (let x = 16; x < rect.width - 16; x += 22) {
            if (document.elementFromPoint(rect.left + x, rect.top + y) === canvas) {
              free.push({ x: rect.left + x, y: rect.top + y });
            }
          }
        }
        for (const candidate of free) {
          fire('pointerdown', candidate.x, candidate.y);
          fire('pointerup', candidate.x, candidate.y, 1, 0);
          await new Promise((resolve) => setTimeout(resolve, 80));
          const button = document.querySelector('[data-testid="sitio-setup-confirm"]');
          if (button instanceof HTMLButtonElement && !button.disabled) return 'ready';
        }
        return 'none';
      });
      expect(dragged).toBe('ready');
      await page.getByTestId('sitio-setup-confirm').click();
      await expect(page.getByTestId('sitio-tutorial')).toHaveAttribute('data-step', 'house');
      await expect(page.getByTestId('sitio-setup-status')).toContainText('Toque no mapa');
    }
    await context.close();
  }
});
