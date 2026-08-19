/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

// Valid in-app routes that must resolve to real pages (never the not-found page).
// `metrics/explorer` is intentionally excluded from the metrics list: Metrics
// Explorer is deprecated and slated for removal, so we don't couple this check
// to a route that is being retired.
const VALID_LOGS_ROUTES = ['anomalies', 'log-categories'];
const VALID_METRICS_ROUTES = ['inventory', 'hosts', 'detail/hosts/host_name'];

test.describe(
  'Infra Not Found page',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('Logs app renders the not-found page only for unknown routes', async ({
      pageObjects: { notFoundPage },
    }) => {
      await test.step('renders the not-found page for an unknown route', async () => {
        await notFoundPage.gotoLogsRoute('broken-link');
        await expect(notFoundPage.notFoundPage).toBeVisible();
        await expect(notFoundPage.notFoundPage).toContainText('Logs');
      });

      for (const route of VALID_LOGS_ROUTES) {
        await test.step(`does not render the not-found page for ${route}`, async () => {
          await notFoundPage.gotoLogsRoute(route);
          await expect(notFoundPage.notFoundPage).toBeHidden();
        });
      }
    });

    test('Metrics app renders the not-found page only for unknown routes', async ({
      pageObjects: { notFoundPage },
    }) => {
      await test.step('renders the not-found page for an unknown route', async () => {
        await notFoundPage.gotoMetricsRoute('broken-link');
        await expect(notFoundPage.notFoundPage).toBeVisible();
        await expect(notFoundPage.notFoundPage).toContainText('Infrastructure');
      });

      for (const route of VALID_METRICS_ROUTES) {
        await test.step(`does not render the not-found page for ${route}`, async () => {
          await notFoundPage.gotoMetricsRoute(route);
          await expect(notFoundPage.notFoundPage).toBeHidden();
        });
      }
    });
  }
);
