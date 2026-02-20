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
      await esArchiver.loadIfNeeded('risk_scores_new_complete_data');
      await esArchiver.loadIfNeeded('query_alert', { useCreate: true, docsOnly: true });
    });

    test.beforeEach(async ({ page, browserAuth, apiServices }) => {
      await page.route('**/internal/risk_score/engine/status', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ risk_engine_status: 'ENABLED' }),
        })
      );
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esArchiver, apiServices }) => {
      try {
        const { deleteAlertsAndRules } = await import('../../../common/api_helpers');
        await deleteAlertsAndRules(apiServices);
      } catch {
        // Best-effort cleanup
      }
      try {
        await apiServices.entityAnalytics.deleteRiskEngineConfiguration();
      } catch {
        // Best-effort cleanup
      }
      try {
        await esArchiver.unload('risk_scores_new_complete_data');
      } catch {
        // Best-effort cleanup
      }
    });

    test('renders risk tab', async ({ page, pageObjects }) => {
      await page.gotoApp('security/hosts/Host-fwarau82er/authentications');
      await pageObjects.hostRiskTab.navigateToHostRiskTab();

      await expect(page.getByTestId('toolbar-alerts-count').first()).toHaveText('1 alert');
      await expect(
        page.getByTestId('dataGridRowCell').getByText('Endpoint Security').first()
      ).toBeVisible();
    });

    test('shows risk information overlay when button is clicked', async ({ page, pageObjects }) => {
      await page.gotoApp('security/hosts/siem-kibana/authentications');
      await pageObjects.hostRiskTab.navigateToHostRiskTab();
      await pageObjects.entityAnalyticsRiskInfo.openRiskInformationFlyout();

      await expect(
        pageObjects.entityAnalyticsRiskInfo.riskInformationFlyoutHeader.first()
      ).toContainText('Entity Risk Analytics');
    });
  }
);
