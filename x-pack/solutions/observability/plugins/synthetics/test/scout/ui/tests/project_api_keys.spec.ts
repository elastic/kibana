/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import type { Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('ProjectAPIKeys', { tag: tags.stateful.classic }, () => {
  test('generates API key and verifies viewer restrictions', async ({
    pageObjects,
    page,
    browserAuth,
  }, testInfo) => {
    await test.step('login and navigate to settings', async () => {
      await browserAuth.loginAsAdmin();
      await pageObjects.syntheticsApp.navigateToSettings();
    });

    await test.step('generate project API key', async () => {
      await pageObjects.syntheticsApp.navigateToSettingsTab('Project API Keys');
      await page.locator('button:has-text("Generate Project API key")').click();
      await expect(
        page.getByText(
          'This API key will only be shown once. Please keep a copy for your own records.'
        )
      ).toBeVisible();
      await expect(page.locator('strong:has-text("API key")')).toBeVisible();
      // TODO: This test can be removed when
      // https://github.com/elastic/kibana/issues/258482 is resolved.
      await expectNoLegacyThemeDependency({
        page,
        target: page.testSubj.locator('syntheticsProjectApiKeyHelpCommands'),
        testInfo,
        name: 'synthetics-project-api-key-help-commands',
      });
    });

    await test.step('viewer cannot generate API keys', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.syntheticsApp.navigateToSettings();
      await pageObjects.syntheticsApp.navigateToSettingsTab('Project API Keys');
      const generateBtn = page.locator('button:has-text("Generate Project API key")');
      await expect(generateBtn).toBeDisabled();
    });
  });
});

// TODO: This test can be removed when
// https://github.com/elastic/kibana/issues/258482 is resolved.
const LEGACY_THEME_LINK_SELECTOR =
  'link[href*="legacy_light_theme.min.css"], link[href*="legacy_dark_theme.min.css"]';

const expectNoLegacyThemeDependency = async ({
  page,
  target,
  testInfo,
  name,
}: {
  page: ScoutPage;
  target: Locator;
  testInfo: {
    attach: (name: string, options: { body: Buffer; contentType: string }) => Promise<void>;
  };
  name: string;
}) => {
  await expect(target).toBeVisible();

  const beforeBox = await expectVisibleBox(target);
  const beforeScreenshot = await target.screenshot();

  await page.evaluate(async (selector) => {
    document.querySelectorAll<HTMLLinkElement>(selector).forEach((link) => link.remove());
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }, LEGACY_THEME_LINK_SELECTOR);

  await expect(target).toBeVisible();
  await expect(target).toContainText('SYNTHETICS_API_KEY');
  await expect(target).toContainText('npm run push');

  const afterBox = await expectVisibleBox(target);
  const afterScreenshot = await target.screenshot();

  await testInfo.attach(`${name}-with-legacy-theme`, {
    body: beforeScreenshot,
    contentType: 'image/png',
  });
  await testInfo.attach(`${name}-without-legacy-theme`, {
    body: afterScreenshot,
    contentType: 'image/png',
  });

  expect(getBoxDimensionDelta(afterBox.width, beforeBox.width)).toBeLessThanOrEqual(0.01);
  expect(getBoxDimensionDelta(afterBox.height, beforeBox.height)).toBeLessThanOrEqual(0.01);
};

const expectVisibleBox = async (target: Locator) => {
  const box = await target.boundingBox();
  expect(box, 'Expected target to have a visible bounding box').not.toBeNull();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);
  return box!;
};

const getBoxDimensionDelta = (after: number, before: number) => {
  if (before === 0) {
    return after === 0 ? 0 : Infinity;
  }
  return Math.abs(after - before) / before;
};
