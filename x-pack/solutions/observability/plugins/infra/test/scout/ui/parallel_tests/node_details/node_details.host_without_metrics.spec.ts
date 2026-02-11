/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { HOST7_NAME } from '../../fixtures/constants';

test.describe(
  'Node Details: host without metrics',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { nodeDetailsPage } }) => {
      await browserAuth.loginAsViewer();
      await nodeDetailsPage.goToPage(HOST7_NAME, 'host', { name: HOST7_NAME });
    });

    test('Overview Tab - KPI tiles show N/A', async ({ pageObjects: { nodeDetailsPage } }) => {
      await nodeDetailsPage.clickOverviewTab();
      const kpiTiles = ['cpuUsage', 'normalizedLoad1m', 'memoryUsage', 'diskUsage'];

      for (const metric of kpiTiles) {
        await test.step(`verify ${metric} tile shows N/A`, async () => {
          const tileValue = await nodeDetailsPage.getKPITileValue(metric);
          expect(tileValue).toBe('N/A');
        });
      }
    });
  }
);
