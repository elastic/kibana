/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { ALERTS_URL, TIMELINES_URL } from '../../../common/urls';
import { SECURITY_ARCHIVES } from '../../../common/es_helpers';
import { deleteTimelines } from '../../../common/timeline_api_helpers';

test.describe('Ransomware Detection Alerts', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ esArchiver }) => {
    await esArchiver.loadIfNeeded(SECURITY_ARCHIVES.RANSOMWARE_DETECTION);
  });

  test.afterAll(async ({ esArchiver }) => {
    // no-op: Scout EsArchiverFixture does not support unload;
  });

  test('should show ransomware alerts on alerts page', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(ALERTS_URL);
    await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });

    await test.step('Verify ransomware alert in table', async () => {
      const alertRuleName = page.testSubj.locator('formatted-field-kibana.alert.rule.name');
      await expect(alertRuleName).toHaveText('Ransomware Detection Alert');
    });

    await test.step('Verify ransomware alert in trend chart', async () => {
      const trendButton = page.testSubj.locator('chart-select-trend');
      await trendButton.click();
      await expect(page.testSubj.locator('alerts-histogram-panel')).toBeVisible();

      const legendItem = page.locator('.echLegendItem__label');
      await expect(legendItem).toHaveText('Ransomware Detection Alert');
    });
  });

  test('should show ransomware entries in timelines table', async ({
    browserAuth,
    page,
    kbnClient,
  }) => {
    await deleteTimelines(kbnClient);
    await browserAuth.loginAsAdmin();
    await page.goto(TIMELINES_URL);

    await page.testSubj.locator('timeline-bottom-bar-title-button').click();

    const queryInput = page.testSubj.locator('timelineQueryInput');
    await queryInput.fill('event.code: "ransomware"');
    await page.keyboard.press('Enter');

    const analyzerIcon = page.testSubj.locator('timeline-action-button-view-in-analyzer');
    await expect(analyzerIcon).toBeVisible({ timeout: 30_000 });

    const messageCell = page.testSubj.locator('formatted-field-message');
    await expect(messageCell).toHaveText('Ransomware Detection Alert');
  });
});
