/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TEMPORARY screenshot harness for PR #298989 — local runs only, do not commit.

import path from 'path';
import type { ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const OUT_DIR = process.env.DARK_MODE_SHOTS_DIR ?? '/tmp/dark-mode-shots';
const LABEL = process.env.DARK_MODE_SHOTS_LABEL ?? 'unlabeled';

const queryParams = {
  dateRangeStart: '2021-11-21T22:06:06.502Z',
  dateRangeEnd: '2021-11-21T22:10:08.203Z',
};

async function setColorModeViaDevToolbar(page: ScoutPage, mode: 'light' | 'dark') {
  const expand = page.getByRole('button', { name: 'Expand developer toolbar' });
  const toggle = page.getByRole('button', { name: 'Toggle color theme' });
  await expand.or(toggle).waitFor({ state: 'visible' });
  if (await expand.isVisible()) {
    await expand.click();
  }
  const target = mode === 'dark' ? 'Dark' : 'Light';
  if ((await toggle.innerText()).trim() === target) return;
  await toggle.click();
  await page.waitForFunction(
    (suffix) => (window as { __kbnThemeTag__?: string }).__kbnThemeTag__?.endsWith(suffix),
    mode
  );
}

const placeholderBorders = (page: ScoutPage) =>
  page.testSubj
    .locator('pingTimestampNoImageAvailable')
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).borderTopColor));

test.describe('Uptime dark mode toggle', { tag: '@local-stateful-classic' }, () => {
  test('ping list placeholders follow a live theme switch', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await browserAuth.loginAsViewer();
    await pageObjects.uptimeOverview.goto(queryParams);
    await pageObjects.uptimeOverview.clickMonitorByName('test-monitor - inline');

    const placeholders = page.testSubj.locator('pingTimestampNoImageAvailable');
    await expect.poll(() => placeholders.count(), { timeout: 30_000 }).toBeGreaterThan(0);

    // eslint-disable-next-line no-console
    console.log(`[${LABEL}] light placeholder borders: ${JSON.stringify(await placeholderBorders(page))}`);

    await setColorModeViaDevToolbar(page, 'dark');
    // styled-components restyles synchronously on the provider update; give the frame a beat.
    await page.waitForTimeout(1500);

    // eslint-disable-next-line no-console
    console.log(`[${LABEL}] dark placeholder borders: ${JSON.stringify(await placeholderBorders(page))}`);

    await page.testSubj
      .locator('pingTimestampNoImageAvailable')
      .evaluateAll((els) => els[0]?.scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: path.join(OUT_DIR, `${LABEL}-uptime-ping-list.png`) });
  });
});
