/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';

test.describe(
  'All hosts table',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeAll(async ({ esArchiver, page, browserAuth }) => {
      await esArchiver.loadIfNeeded('risk_scores_new');
      await browserAuth.loginAsAdmin();
      await page.route('**/internal/risk_score/engine/status', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ risk_engine_status: 'ENABLED' }),
        })
      );
    });

    test.afterAll(async ({ esArchiver }) => {
      try {
        // no-op: Scout EsArchiverFixture does not support unload;
      } catch {
        // Best-effort cleanup
      }
    });

    test('it renders risk column', async ({ page, pageObjects }) => {
      await page.gotoApp('security/hosts/allHosts');
      await page.getByTestId('queryInput').first().fill('host.name: "siem-kibana"');
      await page.keyboard.press('Enter');

      await expect(page.getByTestId('tableHeaderCell_node.risk_4').first()).toBeVisible();
      const firstRow = page.locator('.euiTableRow').first();
      await expect(firstRow.locator('.euiTableCellContent').nth(4)).toHaveText('Critical');
    });
  }
);
