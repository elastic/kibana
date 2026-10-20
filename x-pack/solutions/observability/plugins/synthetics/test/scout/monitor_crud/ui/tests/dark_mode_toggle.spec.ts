/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TEMPORARY screenshot harness for PR #298989 — local runs only, do not commit.

import path from 'path';
import type { ScoutPage } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../../common/ui/fixtures';

const OUT_DIR = process.env.DARK_MODE_SHOTS_DIR ?? '/tmp/dark-mode-shots';
const LABEL = process.env.DARK_MODE_SHOTS_LABEL ?? 'unlabeled';

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

const errorIconStyles = (page: ScoutPage) =>
  page.testSubj.locator('syntheticsMetricItemIconButton').evaluateAll((buttons) =>
    buttons.map((button) => {
      const wrapper = button.closest('div');
      const style = wrapper ? getComputedStyle(wrapper) : undefined;
      return { background: style?.backgroundColor, border: style?.borderTopColor };
    })
  );

test.describe('Synthetics dark mode toggle', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
  });

  test('overview error icon follows a live theme switch', async ({
    pageObjects,
    page,
    browserAuth,
    syntheticsServices,
  }) => {
    const configId = await syntheticsServices.addMonitor('Dark Mode Down Monitor', {
      type: 'http',
      urls: 'https://www.google.com',
    });
    await syntheticsServices.addSummaryDocument({ docType: 'summaryDown', configId });

    await page.setViewportSize({ width: 1600, height: 1000 });
    // An admin visit enables Synthetics; otherwise the overview redirects to Management.
    await browserAuth.loginAsAdmin();
    await pageObjects.syntheticsApp.navigateToOverview(15);
    await page.testSubj.click('syntheticsMonitorOverviewTab');

    const errorIcon = page.testSubj.locator('syntheticsMetricItemIconButton');
    await expect(errorIcon).toBeVisible({ timeout: 30_000 });

    // eslint-disable-next-line no-console
    console.log(`[${LABEL}] light error icon: ${JSON.stringify(await errorIconStyles(page))}`);

    await setColorModeViaDevToolbar(page, 'dark');
    // Emotion restyles on the context update; give the frame a beat.
    await page.waitForTimeout(1500);

    // eslint-disable-next-line no-console
    console.log(`[${LABEL}] dark error icon: ${JSON.stringify(await errorIconStyles(page))}`);

    await page.screenshot({ path: path.join(OUT_DIR, `${LABEL}-synthetics-overview.png`) });

    const iconBox = await errorIcon.boundingBox();
    if (iconBox) {
      await page.screenshot({
        path: path.join(OUT_DIR, `${LABEL}-synthetics-error-icon.png`),
        clip: { x: iconBox.x - 390, y: iconBox.y - 20, width: 440, height: 110 },
      });
    }
  });
});
