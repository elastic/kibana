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
    // Regression guard for the relative-range drift bug: once the page had been
    // idle, the KPIs and the table could resolve `now` at different instants, so
    // the KPI query hit a window without data and showed 'N/A' while the table
    // still listed hosts. The KPIs must re-resolve the *same* window the table
    // uses, so as long as the (drifted) range still covers the data the tiles
    // keep showing values, never 'N/A'. A `now-15m` range comfortably covers the
    // pre-ingested data window under a few minutes of drift.
    test('keeps KPIs consistent with the table (no N/A) when the clock drifts within range', async ({
      browserAuth,
      pageObjects: { hostsPage },
      page,
    }) => {
      test.setTimeout(180_000);

      await test.step('install clock and navigate with a relative range covering the data', async () => {
        await browserAuth.loginAsViewer();
        // Freeze browser Date.now() at the midpoint of the pre-ingested data
        // window so `now-15m` / `now` resolves to a range containing all hosts.
        await page.clock.install({ time: new Date(DATE_WITH_HOSTS_DATA_MIDPOINT) });
        await hostsPage.goToPageWithRelativeRange({
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          preferredSchema: 'ecs',
        });
      });

      await test.step('all hosts and KPIs render with data', async () => {
        await expect(hostsPage.tableRows).toHaveCount(HOSTS.length);
        await hostsPage.waitForHostKPIChartsToLoad(KPI_METRICS, KPI_RENDER_TIMEOUT);
        for (const metric of KPI_METRICS) {
          // Non-empty and not the regression symptom 'N/A'.
          await expect(hostsPage.getHostKPIChartValueLocator(metric)).toHaveAttribute(
            'title',
            /^(?!N\/A$).+/
          );
        }
      });

      await test.step('drift the clock but keep the data in range, then refresh', async () => {
        // Advance 5 minutes: `now-15m` / `now` still covers the data window.
        await page.clock.fastForward('05:00');
        await hostsPage.clickRefresh();
      });

      await test.step('table still has data and KPIs never show N/A', async () => {
        await expect(hostsPage.tableRows).toHaveCount(HOSTS.length);
        await hostsPage.waitForHostKPIChartsToLoad(KPI_METRICS, KPI_RENDER_TIMEOUT);
        for (const metric of KPI_METRICS) {
          await expect(hostsPage.getHostKPIChartValueLocator(metric)).toHaveAttribute(
            'title',
            /^(?!N\/A$).+/
          );
        }
      });
    });

    test('keeps KPIs stable (no N/A) through incremental clock drift with repeated refreshes', async ({
      browserAuth,
      pageObjects: { hostsPage },
      page,
    }) => {
      test.setTimeout(180_000);

      await test.step('install clock and navigate with a relative range covering the data', async () => {
        await browserAuth.loginAsViewer();
        await page.clock.install({ time: new Date(DATE_WITH_HOSTS_DATA_MIDPOINT) });
        await hostsPage.goToPageWithRelativeRange({
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          preferredSchema: 'ecs',
        });
      });

      await test.step('initial state has data', async () => {
        await expect(hostsPage.tableRows).toHaveCount(HOSTS.length);
        await hostsPage.waitForHostKPIChartsToLoad(KPI_METRICS, KPI_RENDER_TIMEOUT);
      });

      await test.step('drift and refresh in increments; data stays in range and KPIs never show N/A', async () => {
        // The Hosts page disables auto-refresh (isAutoRefreshDisabled), so we
        // simulate periodic refreshes by advancing the clock and clicking
        // Refresh. Each increment keeps the data inside `now-15m` / `now`, so the
        // table stays populated and the KPIs must stay consistent with it.
        const driftSteps = ['02:00', '02:00', '02:00'] as const;
        for (const step of driftSteps) {
          await page.clock.fastForward(step);
          await hostsPage.clickRefresh();
          await expect(hostsPage.tableRows).toHaveCount(HOSTS.length);
          const snapshot = await hostsPage.getKPIValuesSnapshot(KPI_RENDER_TIMEOUT);
          for (const metric of KPI_METRICS) {
            expect(snapshot[metric]).not.toBe('N/A');
            expect(snapshot[metric]).toBeTruthy();
          }
        }
      });
    });
  }
);
