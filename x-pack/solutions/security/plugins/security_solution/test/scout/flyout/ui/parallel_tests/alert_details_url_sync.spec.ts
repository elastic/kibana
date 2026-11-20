/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const FLYOUT_URL_PARAM = 'flyoutV2';

// The ES cluster is shared by parallel workers and other configs in the lane, which index into
// the default security patterns (auditbeat-*, logs-*, ...). The rule reads only this per-space
// index so it produces exactly one alert, keeping the rule-name cell unique in the alerts table.
const getSourceIndex = (spaceId: string) => `scout-alert-url-sync-source-${spaceId}`;

spaceTest.describe(
  'Expandable flyout state sync',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.setTimeout(5 * 60_000);

    spaceTest.beforeEach(async ({ browserAuth, apiServices, esClient, scoutSpace }) => {
      const sourceIndex = getSourceIndex(scoutSpace.id);
      await esClient.indices.delete({ index: sourceIndex, ignore_unavailable: true });
      await esClient.index({
        index: sourceIndex,
        document: { '@timestamp': new Date().toISOString(), event: { kind: 'event' } },
        refresh: true,
      });

      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
        index: [sourceIndex],
      });
      await apiServices.detectionAlerts.waitForAlerts(ruleName, 1, 120_000);
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices, esClient, scoutSpace }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
      await esClient.indices.delete({
        index: getSourceIndex(scoutSpace.id),
        ignore_unavailable: true,
      });
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
