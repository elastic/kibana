/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  createInvestigation,
  deleteInvestigation,
  enableAlertZero,
  test,
  testData,
} from '../fixtures';

test.describe('AlertZero queue page width', { tag: tags.stateful.classic }, () => {
  let restoreAlertZero: (() => Promise<void>) | undefined;
  let investigationId: string | undefined;

  test.beforeAll(async ({ apiServices, kbnClient }) => {
    restoreAlertZero = await enableAlertZero({ apiServices, kbnClient });
    investigationId = await createInvestigation(kbnClient, 'Scout trend chart width');
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ kbnClient }) => {
    if (investigationId) {
      await deleteInvestigation(kbnClient, investigationId);
    }
    await restoreAlertZero?.();
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
