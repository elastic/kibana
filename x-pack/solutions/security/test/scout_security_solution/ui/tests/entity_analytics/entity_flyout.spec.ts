/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';

const USER_NAME = 'user1';
const SIEM_KIBANA_HOST_NAME = 'Host-fwarau82er';

test.describe(
  'Entity Flyout',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ page, browserAuth, esArchiver, apiServices }) => {
      await esArchiver.loadIfNeeded('risk_scores_new_complete_data');
      await esArchiver.loadIfNeeded('query_alert', { useCreate: true, docsOnly: true });
      await esArchiver.loadIfNeeded('user_managed_data');

      await page.route('**/internal/risk_score/engine/status', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ risk_engine_status: 'ENABLED' }),
        })
      );

      await browserAuth.loginAsAdmin();
      await page.gotoApp('security/alerts');
    });

    test.afterEach(async ({ apiServices, esArchiver }) => {
      try {
        const { deleteAlertsAndRules } = await import('../../common/api_helpers');
        await deleteAlertsAndRules(apiServices);
      } catch {
        // Best-effort cleanup
      }
      try {
        await esArchiver.unload('risk_scores_new_complete_data');
        await esArchiver.unload('user_managed_data');
      } catch {
        // Best-effort cleanup
      }
    });

    test.describe('User details', () => {
      test('should display entity flyout and open risk input panel', async ({
        pageObjects,
        page,
      }) => {
        await pageObjects.securityCommon.waitForAlertsToPopulate();
        await pageObjects.securityCommon.expandFirstAlertUserFlyout();

        await expect(
          page.getByTestId('users-link-anchor').first().getByText(USER_NAME)
        ).toBeVisible();

        await pageObjects.entityAnalyticsFlyout.expandRiskInputsPanel();
        await expect(pageObjects.entityAnalyticsFlyout.riskInputPanelHeader.first()).toBeVisible();
      });

      test.describe('Asset criticality', () => {
        test('should show asset criticality in the risk input panel', async ({
          pageObjects,
        }) => {
          await pageObjects.securityCommon.waitForAlertsToPopulate();
          await pageObjects.securityCommon.expandFirstAlertUserFlyout();
          await pageObjects.entityAnalyticsFlyout.expandRiskInputsPanel();
          await expect(
            pageObjects.entityAnalyticsFlyout.assetCriticalityBadge.first()
          ).toContainText('Extreme Impact');
        });

        test('should display asset criticality accordion', async ({ pageObjects }) => {
          await pageObjects.securityCommon.waitForAlertsToPopulate();
          await pageObjects.securityCommon.expandFirstAlertUserFlyout();

          await expect(
            pageObjects.entityAnalyticsFlyout.assetCriticalitySelector.first()
          ).toContainText('Asset Criticality');
          await expect(
            pageObjects.entityAnalyticsFlyout.assetCriticalityButton.first()
          ).toHaveText('Assign');
        });

        test('should display asset criticality modal', async ({ pageObjects }) => {
          await pageObjects.securityCommon.waitForAlertsToPopulate();
          await pageObjects.securityCommon.expandFirstAlertUserFlyout();
          await pageObjects.entityAnalyticsFlyout.toggleAssetCriticalityModal();

          await expect(
            pageObjects.entityAnalyticsFlyout.assetCriticalityModalTitle.first()
          ).toHaveText('Change asset criticality');
        });

        test('should update asset criticality state', async ({ pageObjects }) => {
          await pageObjects.securityCommon.waitForAlertsToPopulate();
          await pageObjects.securityCommon.expandFirstAlertUserFlyout();
          await pageObjects.entityAnalyticsFlyout.selectAssetCriticalityLevel('High Impact');

          await expect(
            pageObjects.entityAnalyticsFlyout.assetCriticalityLevel.first()
          ).toContainText('High Impact');
        });

        test('should unassign asset criticality state', async ({ pageObjects }) => {
          await pageObjects.securityCommon.waitForAlertsToPopulate();
          await pageObjects.securityCommon.expandFirstAlertUserFlyout();
          await pageObjects.entityAnalyticsFlyout.selectAssetCriticalityLevel('High Impact');
          await expect(
            pageObjects.entityAnalyticsFlyout.assetCriticalityLevel.first()
          ).toContainText('High Impact');

          await pageObjects.entityAnalyticsFlyout.selectAssetCriticalityLevel('Unassigned');
          await expect(
            pageObjects.entityAnalyticsFlyout.assetCriticalityLevel.first()
          ).toContainText('Unassigned');
        });
      });
    });

    test.describe('Host details', () => {
      test('should display entity flyout and open risk input panel', async ({
        pageObjects,
      }) => {
        await pageObjects.securityCommon.waitForAlertsToPopulate();
        await pageObjects.securityCommon.expandFirstAlertHostFlyout();

        await expect(
          pageObjects.entityAnalyticsFlyout.assetCriticalitySelector.first()
        ).toBeVisible();

        await pageObjects.entityAnalyticsFlyout.expandRiskInputsPanel();
        await expect(pageObjects.entityAnalyticsFlyout.riskInputPanelHeader.first()).toBeVisible();
      });

      test('should show asset criticality in the risk input panel', async ({
        pageObjects,
      }) => {
        await pageObjects.securityCommon.waitForAlertsToPopulate();
        await pageObjects.securityCommon.expandFirstAlertHostFlyout();
        await pageObjects.entityAnalyticsFlyout.expandRiskInputsPanel();
        await expect(
          pageObjects.entityAnalyticsFlyout.assetCriticalityBadge.first()
        ).toContainText('Extreme Impact');
      });

      test('should display asset criticality accordion', async ({ pageObjects }) => {
        await pageObjects.securityCommon.waitForAlertsToPopulate();
        await pageObjects.securityCommon.expandFirstAlertHostFlyout();

        await expect(
          pageObjects.entityAnalyticsFlyout.assetCriticalitySelector.first()
        ).toContainText('Asset Criticality');
        await expect(
          pageObjects.entityAnalyticsFlyout.assetCriticalityButton.first()
        ).toHaveText('Assign');
      });

      test('should display asset criticality modal', async ({ pageObjects }) => {
        await pageObjects.securityCommon.waitForAlertsToPopulate();
        await pageObjects.securityCommon.expandFirstAlertHostFlyout();
        await pageObjects.entityAnalyticsFlyout.toggleAssetCriticalityModal();

        await expect(
          pageObjects.entityAnalyticsFlyout.assetCriticalityModalTitle.first()
        ).toHaveText('Change asset criticality');
      });

      test('should update asset criticality state', async ({ pageObjects }) => {
        await pageObjects.securityCommon.waitForAlertsToPopulate();
        await pageObjects.securityCommon.expandFirstAlertHostFlyout();
        await pageObjects.entityAnalyticsFlyout.selectAssetCriticalityLevel('High Impact');

        await expect(
          pageObjects.entityAnalyticsFlyout.assetCriticalityLevel.first()
        ).toContainText('High Impact');
      });
    });
  }
);
