/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING =
  'securitySolution:enableAlertsAndAttacksAlignment';
const ENABLE_NEW_FLYOUT_SETTING = 'securitySolution:enableNewFlyout';

spaceTest.describe(
  'Attack details flyout',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await apiServices.attackDiscovery.seedAttackData();
      await apiServices.attackDiscovery.seedAttackSchedule();
    });

    spaceTest.beforeEach(async ({ browserAuth, scoutSpace, pageObjects }) => {
      const { detectionsAttackDiscoveryPage, attackDetailsRightPanelPage } = pageObjects;

      await scoutSpace.uiSettings.set({
        [ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING]: true,
        [ENABLE_NEW_FLYOUT_SETTING]: false,
      });
      await browserAuth.loginAsPlatformEngineer();

      await detectionsAttackDiscoveryPage.navigateToAttacksPage();
      await detectionsAttackDiscoveryPage.collapseKpisSection();
      await expect(detectionsAttackDiscoveryPage.attacksTableSection).toBeAttached();
      await detectionsAttackDiscoveryPage.attacksTableSection.scrollIntoViewIfNeeded();
      await expect(detectionsAttackDiscoveryPage.attacksTableSection).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.tableExpandAttackDetailsButtons).toHaveCount(2);
      await detectionsAttackDiscoveryPage.openFirstAttackDetailsFromTable();
      await expect(attackDetailsRightPanelPage.detailsFlyoutBody).toBeAttached();
      await attackDetailsRightPanelPage.detailsFlyoutBody.scrollIntoViewIfNeeded();
      await expect(attackDetailsRightPanelPage.detailsFlyoutBody).toBeVisible();
    });

    spaceTest.afterEach(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING);
      await scoutSpace.uiSettings.unset(ENABLE_NEW_FLYOUT_SETTING);
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('shows Insights section in attack details flyout', async ({ pageObjects }) => {
      const { attackDetailsRightPanelPage } = pageObjects;

      await expect(attackDetailsRightPanelPage.insightsSectionHeader).toBeAttached();
      await attackDetailsRightPanelPage.insightsSectionHeader.scrollIntoViewIfNeeded();
      await expect(attackDetailsRightPanelPage.insightsSectionHeader).toBeVisible();
      await attackDetailsRightPanelPage.expandInsightsSectionIfCollapsed();
      await expect(attackDetailsRightPanelPage.insightsSectionContent).toBeAttached();
      await attackDetailsRightPanelPage.insightsSectionContent.scrollIntoViewIfNeeded();
      await expect(attackDetailsRightPanelPage.insightsSectionContent).toBeVisible();
    });

    spaceTest('shows Correlations section in attack details flyout', async ({ pageObjects }) => {
      const { attackDetailsRightPanelPage } = pageObjects;

      await attackDetailsRightPanelPage.expandInsightsSectionIfCollapsed();
      await expect(attackDetailsRightPanelPage.insightsSectionContent).toBeAttached();
      await attackDetailsRightPanelPage.insightsSectionContent.scrollIntoViewIfNeeded();
      await expect(attackDetailsRightPanelPage.insightsSectionContent).toBeVisible();
      await expect(attackDetailsRightPanelPage.correlationsSection).toBeAttached();
      await attackDetailsRightPanelPage.correlationsSection.scrollIntoViewIfNeeded();
      await expect(attackDetailsRightPanelPage.correlationsSection).toBeVisible();
    });
  }
);
