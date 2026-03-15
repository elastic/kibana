/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { ALERTS_URL } from '../../../common/urls';
import { SECURITY_ARCHIVES } from '../../../common/es_helpers';
import { deleteTimelines, createTimeline } from '../../../common/timeline_api_helpers';

test.describe('Ransomware Prevention Alerts', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ esArchiver }) => {
    await esArchiver.loadIfNeeded(SECURITY_ARCHIVES.RANSOMWARE_PREVENTION);
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
      await expect(alertRuleName).toHaveText('Ransomware Prevention Alert');
    });

    await test.step('Verify ransomware alert in trend chart', async () => {
      const trendButton = page.testSubj.locator('chart-select-trend');
      await trendButton.click();
      await expect(page.testSubj.locator('alerts-histogram-panel')).toBeVisible();

      const legendItem = page.locator('.echLegendItem__label');
      await expect(legendItem).toHaveText('Ransomware Prevention Alert');
    });
  });

  test('should render ransomware entries in timelines table', async ({
    browserAuth,
    page,
    kbnClient,
  }) => {
    await deleteTimelines(kbnClient);
    await browserAuth.loginAsAdmin();

    const timeline = await createTimeline(kbnClient, {
      title: 'Ransomware Timeline',
      description: 'Timeline for ransomware events',
      query: 'event.code: "ransomware"',
    });

    await page.goto(`/app/security/timelines?timeline=(id:'${timeline.savedObjectId}',isOpen:!t)`);

    const analyzerIcon = page.testSubj.locator('timeline-action-button-view-in-analyzer');
    await expect(analyzerIcon).toBeVisible({ timeout: 30_000 });

    const messageCell = page.testSubj.locator('formatted-field-message');
    await expect(messageCell).toHaveText('Ransomware Prevention Alert');
  });
});
