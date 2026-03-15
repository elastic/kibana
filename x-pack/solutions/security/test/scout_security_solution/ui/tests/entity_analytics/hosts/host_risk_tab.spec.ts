/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';

test.describe(
  'risk tab',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeAll(async ({ esArchiver }) => {
      await esArchiver.loadIfNeeded('risk_scores_new');
    });

    test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await page.route('**/internal/risk_score/engine/status', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ risk_engine_status: 'ENABLED' }),
        })
      );
      await page.gotoApp('security/hosts/allHosts');
      await page.getByText('siem-kibana').first().waitFor({ state: 'visible', timeout: 10000 });
      await pageObjects.hostRiskTab.navigateToHostRiskTab();
    });

    test.afterAll(async ({ esArchiver }) => {
      try {
        // no-op: Scout EsArchiverFixture does not support unload;
      } catch {
        // Best-effort cleanup
      }
    });

    test('renders the table', async ({ page, pageObjects }) => {
      await page.getByTestId('queryInput').first().fill('host.name: "siem-kibana"');
      await page.keyboard.press('Enter');
      await expect(pageObjects.hostRiskTab.hostByRiskTableCell.nth(4).first()).toHaveText(
        'siem-kibana'
      );
      await expect(pageObjects.hostRiskTab.hostByRiskTableCell.nth(5).first()).toContainText(
        '2021'
      );
      await expect(pageObjects.hostRiskTab.hostByRiskTableCell.nth(6).first()).toHaveText('90.00');
      await expect(pageObjects.hostRiskTab.hostByRiskTableCell.nth(7).first()).toHaveText(
        'Critical'
      );
    });

    test('filters the table', async ({ pageObjects }) => {
      await pageObjects.hostRiskTab.openRiskTableFilterAndSelectCritical();
      await expect(pageObjects.hostRiskTab.hostByRiskTableCell.nth(3).first()).not.toHaveText(
        'siem-kibana'
      );
      await pageObjects.hostRiskTab.removeCriticalFilterAndClose();
    });

    test('should be able to change items count per page', async ({ pageObjects }) => {
      await pageObjects.hostRiskTab.selectFiveItemsPerPage();
      await expect(pageObjects.hostRiskTab.hostByRiskTableHostnameCell).toHaveCount(5);
    });

    test('should not allow page change when page is empty', async ({ page, pageObjects }) => {
      await page.getByTestId('queryInput').first().fill('host.name: "nonexistent_host"');
      await page.keyboard.press('Enter');
      await expect(pageObjects.hostRiskTab.hostByRiskTableNextPageButton.first()).not.toBeVisible();
    });
  }
);
