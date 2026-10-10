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
    let indexName: string;

    spaceTest.setTimeout(5 * 60_000);

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace, esClient }) => {
      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      indexName = `flyout-url-sync-${scoutSpace.id}`;
      await esClient.index({
        index: indexName,
        id: 'flyout-url-sync',
        document: { '@timestamp': new Date().toISOString() },
        refresh: 'wait_for',
      });
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
        index: [indexName],
      });
      await apiServices.detectionAlerts.waitForAlerts(ruleName, 1, 120_000);
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices, esClient }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
      await esClient.indices.delete({ index: indexName });
    });

    spaceTest('should test flyout url sync', async ({ pageObjects, page }) => {
      await pageObjects.alertsTablePage.navigate();

      const urlBeforeAlertDetails = page.url();
      expect(urlBeforeAlertDetails).not.toContain(FLYOUT_URL_PARAM);

      await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
      await pageObjects.alertsTablePage.alertsTable.scrollIntoViewIfNeeded();
      await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);

      const urlAfterAlertDetails = page.url();
      expect(urlAfterAlertDetails).toContain(FLYOUT_URL_PARAM);

      const headerTitle = pageObjects.alertDetailsRightPanelPage.detailsFlyoutHeaderTitle;
      await expect(headerTitle).toHaveText(ruleName);

      await page.reload();
      await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);

      const urlAfterReload = page.url();
      expect(urlAfterReload).toContain(FLYOUT_URL_PARAM);

      await pageObjects.alertDetailsRightPanelPage.closeFlyout();

      const urlAfterClosingFlyout = page.url();
      expect(urlAfterClosingFlyout).not.toContain(FLYOUT_URL_PARAM);
    });
  }
);
