/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';
import { createRule } from '../../common/api_helpers';

test.describe(
  'Entity analytics management page',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeAll(async ({ esArchiver }) => {
      await esArchiver.loadIfNeeded('all_users');
    });

    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await createRule(apiServices, {
        query: 'user.name:* or host.name:*',
        risk_score: 70,
      });
      await apiServices.entityAnalytics.deleteRiskEngineConfiguration();
    });

    test.afterAll(async ({ esArchiver }) => {
      try {
        await esArchiver.unload('all_users');
      } catch {
        // Best-effort cleanup
      }
    });

    test('renders page as expected', async ({ pageObjects }) => {
      await pageObjects.entityAnalyticsManagement.navigate();
      await expect(pageObjects.entityAnalyticsManagement.pageTitle).toHaveText(
        'Entity risk score'
      );
    });

    test.describe('Risk preview', () => {
      test('show error panel if API returns error and then try to refetch data', async ({
        page,
        pageObjects,
      }) => {
        await page.route('**/internal/risk_score/preview', (route) =>
          route.fulfill({ status: 500 })
        );
        await pageObjects.entityAnalyticsManagement.navigate();

        await expect(
          pageObjects.entityAnalyticsManagement.riskPreviewError.first()
        ).toContainText('Preview failed');

        await page.route('**/internal/risk_score/preview', (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ scores: { host: [], user: [] } }),
          })
        );
        await pageObjects.entityAnalyticsManagement.clickPreviewErrorButton();

        await expect(
          pageObjects.entityAnalyticsManagement.riskPreviewError.first()
        ).not.toBeVisible();
      });
    });

    test.describe('Risk engine', () => {
      test('should init, disable and enable risk engine', async ({ pageObjects }) => {
        const mgmt = pageObjects.entityAnalyticsManagement;
        await mgmt.navigate();

        await expect(mgmt.riskScoreStatus.first()).toHaveText('Off');

        await mgmt.clickRiskEngineSwitch();
        await expect(mgmt.riskScoreStatus.first()).toHaveText('On');

        await mgmt.clickRiskEngineSwitch();
        await expect(mgmt.riskScoreStatus.first()).toHaveText('Off');

        await mgmt.clickRiskEngineSwitch();
        await expect(mgmt.riskScoreStatus.first()).toHaveText('On');
      });

      test('should show error panel if API returns error', async ({ page, pageObjects }) => {
        await page.route('**/internal/risk_score/engine/init', (route) =>
          route.fulfill({ status: 500 })
        );

        const mgmt = pageObjects.entityAnalyticsManagement;
        await mgmt.navigate();
        await expect(mgmt.riskScoreStatus.first()).toHaveText('Off');

        await mgmt.clickRiskEngineSwitch();

        await expect(mgmt.riskScoreErrorPanel.first()).toContainText('There was an error');
      });
    });
  }
);
