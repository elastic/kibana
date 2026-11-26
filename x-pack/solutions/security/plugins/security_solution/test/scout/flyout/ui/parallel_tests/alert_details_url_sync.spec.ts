/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const FLYOUT_URL_PARAM = 'flyoutV2';

spaceTest.describe(
  'Expandable flyout state sync',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.setTimeout(5 * 60_000);

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      // Scope the rule to a single space-owned source document: configs sharing the CI lane leave
      // data in the default security indices, which would make this rule raise many alerts.
      const { sourceIndex } = await apiServices.host.createHostFixture(scoutSpace.id);

      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
        index: [sourceIndex],
      });
      await apiServices.detectionAlerts.waitForAlerts(ruleName, 1, 120_000);
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices, scoutSpace }) => {
      try {
        await apiServices.detectionRule.deleteAll();
        await apiServices.detectionAlerts.deleteAll();
      } finally {
        await apiServices.host.cleanupHostFixture(scoutSpace.id);
      }
    });

    spaceTest('should test flyout url sync', async ({ pageObjects, page }) => {
      await pageObjects.alertsTablePage.navigate();

      const urlBeforeAlertDetails = new URL(page.url());
      expect(urlBeforeAlertDetails.searchParams.has(FLYOUT_URL_PARAM)).toBe(false);

      await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
      await pageObjects.alertsTablePage.alertsTable.scrollIntoViewIfNeeded();
      await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);

      const urlAfterAlertDetails = new URL(page.url());
      expect(urlAfterAlertDetails.searchParams.has(FLYOUT_URL_PARAM)).toBe(true);

      const headerTitle = pageObjects.alertDetailsRightPanelPage.detailsFlyoutHeaderTitle;
      await expect(headerTitle).toHaveText(ruleName);

      await page.reload();
      await pageObjects.documentFlyout.waitForAlertFlyout();

      const urlAfterReload = new URL(page.url());
      expect(urlAfterReload.searchParams.has(FLYOUT_URL_PARAM)).toBe(true);
      await expect(headerTitle).toHaveText(ruleName);

      await pageObjects.alertDetailsRightPanelPage.closeFlyout();

      const urlAfterClosingFlyout = new URL(page.url());
      expect(urlAfterClosingFlyout.searchParams.has(FLYOUT_URL_PARAM)).toBe(false);
    });
  }
);
