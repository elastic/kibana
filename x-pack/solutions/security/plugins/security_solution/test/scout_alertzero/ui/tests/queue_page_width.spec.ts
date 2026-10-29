/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import { tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { test, testData } from '../fixtures';

test.describe('AlertZero queue page width', { tag: tags.stateful.classic }, () => {
  // AlertZero works only in a Security solution space, and the default space may be Classic.
  let restoreDefaultSolutionView: (() => Promise<void>) | undefined;
  let investigationId: string | undefined;

  test.beforeAll(async ({ apiServices, kbnClient }) => {
    const {
      data: { solution = 'classic' },
    } = await kbnClient.request<{ solution?: string }>({
      method: 'GET',
      path: '/api/spaces/space/default',
    });
    if (solution !== 'security') {
      await apiServices.spaces.setSolutionView({ id: 'default', solution: 'security' });
      restoreDefaultSolutionView = () =>
        apiServices.spaces.setSolutionView({
          id: 'default',
          solution: solution as 'classic' | 'oblt' | 'es',
        });
    }
    await kbnClient.uiSettings.update({ [ALERTZERO_ENABLED_SETTING_ID]: true });

    // Without an enabled Worker or an investigation, AlertZero shows onboarding, not the queue.
    const created = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: '/api/agent_builder/conversations',
      headers: { 'elastic-api-version': '2023-10-31' },
      body: {
        title: 'Scout trend chart width',
        template_id: 'investigation',
        access_control: { access_mode: 'public' },
        metadata: { status: 'open' },
      },
    });
    investigationId = created.data.id;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ kbnClient }) => {
    if (investigationId) {
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/agent_builder/conversations/${investigationId}`,
        headers: { 'elastic-api-version': '2023-10-31' },
      });
    }
    await kbnClient.uiSettings.unset(ALERTZERO_ENABLED_SETTING_ID);
    await restoreDefaultSolutionView?.();
  });

  test('keeps the trend charts within the window and resizes them when it narrows', async ({
    page,
    pageObjects,
  }) => {
    const { alertZeroQueue } = pageObjects;
    const chartWidths = async () =>
      Promise.all(
        (await alertZeroQueue.trendSparklines.all()).map(
          async (sparkline) => (await sparkline.boundingBox())?.width ?? 0
        )
      );
    let wideChartWidths: number[] = [];

    await test.step('render the charts in a wide window', async () => {
      await page.setViewportSize(testData.WIDE_VIEWPORT);
      await alertZeroQueue.goto();
      await expect(alertZeroQueue.trendChartCards).toHaveCount(3);
      await expect(alertZeroQueue.trendSparklines).toHaveCount(3);
      wideChartWidths = await chartWidths();
    });

    await test.step('narrow the window', async () => {
      await page.setViewportSize(testData.NARROW_VIEWPORT);
    });

    await test.step('the chart row stays inside the window', async () => {
      await expect
        .poll(async () => {
          const box = await alertZeroQueue.trendChartRow.boundingBox();
          return box ? box.x + box.width : Number.POSITIVE_INFINITY;
        })
        .toBeLessThanOrEqual(testData.NARROW_VIEWPORT.width);
    });

    await test.step('each chart stays inside its card', async () => {
      for (const card of await alertZeroQueue.trendChartCards.all()) {
        const sparkline = card.locator(alertZeroQueue.trendSparklines);
        await expect
          .poll(async () => {
            const [cardBox, chartBox] = await Promise.all([
              card.boundingBox(),
              sparkline.boundingBox(),
            ]);
            return cardBox && chartBox
              ? chartBox.x + chartBox.width <= cardBox.x + cardBox.width
              : false;
          })
          .toBe(true);
      }
    });

    await test.step('each chart is narrower than it was in the wide window', async () => {
      await expect
        .poll(async () => {
          const narrowChartWidths = await chartWidths();
          return narrowChartWidths.every((width, index) => width < wideChartWidths[index]);
        })
        .toBe(true);
    });
  });
});
