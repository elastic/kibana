/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import {
  HOSTS,
  DATE_WITH_HOSTS_DATA_MIDPOINT,
  KPI_RENDER_TIMEOUT,
  KPI_METRICS,
} from '../../fixtures/constants';

test.describe(
  'Hosts Page - Time Drift',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test('KPIs never show N/A when clock drifts past the data window', async ({
      browserAuth,
      pageObjects: { hostsPage },
      page,
    }) => {
      test.setTimeout(180_000);

      await test.step('install clock and navigate with relative range', async () => {
        await browserAuth.loginAsViewer();
        // Freeze browser Date.now() at the midpoint of the pre-ingested data window
        // so that `now-1m` / `now` resolves to a range containing all hosts.
        await page.clock.install({ time: new Date(DATE_WITH_HOSTS_DATA_MIDPOINT) });
        await hostsPage.goToPageWithRelativeRange({
          rangeFrom: 'now-1m',
          rangeTo: 'now',
          preferredSchema: 'ecs',
        });
      });

      await test.step('verify all hosts and KPIs render with data', async () => {
        await expect(hostsPage.tableRows).toHaveCount(HOSTS.length);
        await hostsPage.waitForHostKPIChartsToLoad(KPI_METRICS, KPI_RENDER_TIMEOUT);
        for (const metric of KPI_METRICS) {
          const locator = hostsPage.getHostKPIChartValueLocator(metric);
          // The title must be non-empty and must not be the regression symptom 'N/A'.
          await expect(locator).toHaveAttribute('title', /^(?!N\/A$).+/);
        }
      });

      await test.step('fast-forward clock past the data window and refresh', async () => {
        // Advance 2 minutes: `now-1m` now resolves to a window entirely past the data.
        await page.clock.fastForward('02:00');
        await hostsPage.clickRefresh();
      });

      await test.step('verify table is empty and KPIs do not show N/A', async () => {
        await expect(hostsPage.tableRows).toHaveCount(0);
        const snapshot = await hostsPage.getKPIValuesSnapshot(KPI_RENDER_TIMEOUT);
        for (const metric of KPI_METRICS) {
          expect(snapshot[metric]).not.toBe('N/A');
        }
      });
    });

    test('KPIs remain stable through incremental clock drift with repeated refreshes', async ({
      browserAuth,
      pageObjects: { hostsPage },
      page,
    }) => {
      test.setTimeout(180_000);

      await test.step('install clock and navigate with relative range', async () => {
        await browserAuth.loginAsViewer();
        await page.clock.install({ time: new Date(DATE_WITH_HOSTS_DATA_MIDPOINT) });
        await hostsPage.goToPageWithRelativeRange({
          rangeFrom: 'now-1m',
          rangeTo: 'now',
          preferredSchema: 'ecs',
        });
      });

      await test.step('verify initial state has data', async () => {
        await expect(hostsPage.tableRows).toHaveCount(HOSTS.length);
        await hostsPage.waitForHostKPIChartsToLoad(KPI_METRICS, KPI_RENDER_TIMEOUT);
      });

      await test.step('drift and refresh in increments, KPIs stay consistent', async () => {
        // The Hosts page disables auto-refresh (isAutoRefreshDisabled), so we
        // simulate periodic refreshes by advancing the clock and clicking Refresh
        // manually. Each refresh must re-resolve the relative datemath against the
        // advanced clock; KPI tiles must never show 'N/A'.
        const driftSteps = ['00:30', '00:30', '01:00'] as const;
        for (const step of driftSteps) {
          await page.clock.fastForward(step);
          await hostsPage.clickRefresh();
          const snapshot = await hostsPage.getKPIValuesSnapshot(KPI_RENDER_TIMEOUT);
          for (const metric of KPI_METRICS) {
            expect(snapshot[metric]).not.toBe('N/A');
          }
        }
      });
    });
  }
);
