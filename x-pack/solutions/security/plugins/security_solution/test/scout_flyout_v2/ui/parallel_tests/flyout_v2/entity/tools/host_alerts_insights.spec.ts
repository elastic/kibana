/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout UI test for the host entity flyout's Alerts insight tool (a stacked system flyout).
 *
 * Entry path: Alerts page → alerts table host.name cell → host flyout → entity insight section →
 * Alerts insight tool. The seeded alert(s) reference the host, so the tool's alerts table renders them.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE, HOST_NAME } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Host entity flyout v2 - Alerts insight tool',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }, testInfo) => {
      // Rule execution can be slow under parallel load.
      testInfo.setTimeout(testInfo.timeout + 120_000);

      const { sourceIndex } = await apiServices.host.createHostFixture(scoutSpace.id);

      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
        index: [sourceIndex],
      });
      await apiServices.detectionAlerts.waitForAlerts(ruleName, 1, 60_000);

      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices, scoutSpace }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
      await apiServices.host.cleanupHostFixture(scoutSpace.id);
    });

    spaceTest(
      'expanding an alert row opens the document flyout for that rule',
      async ({ pageObjects }) => {
        const { alertsTablePage, hostFlyout, documentFlyout } = pageObjects;
        await alertsTablePage.navigate();
        await alertsTablePage.waitForRuleAlert(ruleName);
        await alertsTablePage.clickHostNameCell(HOST_NAME);
        await hostFlyout.waitForHostFlyout();
        await hostFlyout.openAlertsInsightTool();

        await expect(hostFlyout.alertsInsightsToolTable).toBeVisible();
        await hostFlyout.alertsInsightsToolExpandRow(ruleName).click();

        // The row's expand control opens that alert's document flyout (a full alert flyout, not the
        // child-wrapped variant), titled with the rule name.
        await documentFlyout.waitForAlertFlyout();
        await expect(documentFlyout.title).toContainText(ruleName);
      }
    );
  }
);
