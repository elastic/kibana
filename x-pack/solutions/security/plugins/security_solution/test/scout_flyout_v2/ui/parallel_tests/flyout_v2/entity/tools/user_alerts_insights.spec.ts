/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout UI test for the user entity flyout's Alerts insight tool (a stacked system flyout).
 *
 * Entry path: Alerts page → alerts table user.name cell → user flyout → entity insight section →
 * Alerts insight tool. The seeded alert(s) reference the user, so the tool's alerts table renders them.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE, USER_NAME } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'User entity flyout v2 - Alerts insight tool',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;
    let sourceIndex: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }, testInfo) => {
      // Rule execution can be slow under parallel load.
      testInfo.setTimeout(testInfo.timeout + 120_000);

      ({ sourceIndex } = await apiServices.user.createUserFixture(scoutSpace.id));

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
      await apiServices.user.cleanupUserFixture(scoutSpace.id);
    });

    spaceTest(
      'filters the alerts table by severity',
      async ({ pageObjects, apiServices, scoutSpace }) => {
        // Add a second alert of a different severity (same user) so filtering is observable.
        const lowSeverityRuleName = `${CUSTOM_QUERY_RULE.name}_low_${scoutSpace.id}_${Date.now()}`;
        await apiServices.detectionRule.createCustomQueryRule({
          ...CUSTOM_QUERY_RULE,
          name: lowSeverityRuleName,
          rule_id: `${CUSTOM_QUERY_RULE.rule_id}-low`,
          severity: 'low',
          index: [sourceIndex],
        });
        await apiServices.detectionAlerts.waitForAlerts(lowSeverityRuleName, 1, 60_000);

        const { alertsTablePage, userFlyout } = pageObjects;
        await alertsTablePage.navigate();
        await alertsTablePage.waitForRuleAlert(ruleName);
        await alertsTablePage.clickUserNameCell(USER_NAME);
        await userFlyout.waitForUserFlyout();
        await userFlyout.openAlertsInsightTool();

        await spaceTest.step('both severities are listed', async () => {
          await expect(userFlyout.alertsInsightsToolTable).toBeVisible();
          await expect(userFlyout.alertsInsightsToolAlertSeverities).toHaveCount(2, {
            timeout: 15_000,
          });
        });

        await spaceTest.step(
          'clicking the Low severity segment filters to one Low alert',
          async () => {
            await userFlyout.alertsInsightsToolSeveritySegment('Low').click();
            await expect(userFlyout.alertsInsightsToolAlertSeverities).toHaveCount(1, {
              timeout: 15_000,
            });
            await expect(userFlyout.alertsInsightsToolAlertSeverities).toContainText('Low');
          }
        );
      }
    );

    spaceTest('header opens the user as a child flyout', async ({ pageObjects }) => {
      const { alertsTablePage, userFlyout } = pageObjects;
      await alertsTablePage.navigate();
      await alertsTablePage.waitForRuleAlert(ruleName);
      await alertsTablePage.clickUserNameCell(USER_NAME);
      await userFlyout.waitForUserFlyout();
      await userFlyout.openAlertsInsightTool();

      // The tool header's source context targets the user, and only the originating user flyout
      // exists (mounted behind the tool) at this point.
      await expect(userFlyout.toolsFlyoutTitle).toContainText(USER_NAME);
      await expect(userFlyout.header).toHaveCount(1);

      // Clicking it opens a second user flyout for the same user as a stacked child.
      await userFlyout.toolsFlyoutTitle.click();
      await expect(userFlyout.header).toHaveCount(2);
      await expect(userFlyout.title.filter({ hasText: USER_NAME })).toHaveCount(2);
    });

    spaceTest(
      'expanding an alert row opens the document flyout for that rule',
      async ({ pageObjects }) => {
        const { alertsTablePage, userFlyout, documentFlyout } = pageObjects;
        await alertsTablePage.navigate();
        await alertsTablePage.waitForRuleAlert(ruleName);
        await alertsTablePage.clickUserNameCell(USER_NAME);
        await userFlyout.waitForUserFlyout();
        await userFlyout.openAlertsInsightTool();

        await expect(userFlyout.alertsInsightsToolTable).toBeVisible();
        await userFlyout.alertsInsightsToolExpandRow(ruleName).click();

        // The row's expand control opens that alert's document flyout (a full alert flyout, not the
        // child-wrapped variant), titled with the rule name.
        await documentFlyout.waitForAlertFlyout();
        await expect(documentFlyout.title).toContainText(ruleName);
      }
    );
  }
);
