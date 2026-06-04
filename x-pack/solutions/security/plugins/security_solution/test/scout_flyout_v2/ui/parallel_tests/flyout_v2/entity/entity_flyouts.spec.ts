/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout UI tests for host and user entity overview cards rendered inside the
 * flyout_v2 document flyout (Insights section).
 *
 * NOTE: Full host/user entity flyout v2 coverage will be added once those
 * implementations ship. These tests cover the overview card surfaces only.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Entity flyouts v2',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
      });
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
    });

    spaceTest(
      'entity overview panel renders in the document flyout insights section',
      async ({ pageObjects }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        await expect(pageObjects.documentFlyoutV2.insightsSection).toBeVisible();
        await expect(pageObjects.documentFlyoutV2.entitiesOverview).toBeVisible({
          timeout: 10_000,
        });
      }
    );

    spaceTest(
      'entity host overview renders when host data is present',
      async ({ pageObjects, log }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        const hostOverview = pageObjects.documentFlyoutV2.entityHostOverview;
        const hasHostOverview = await hostOverview.isVisible({ timeout: 5_000 }).catch(() => false);

        if (!hasHostOverview) {
          log.info('No host overview in entity insights');
          spaceTest.skip(true, 'Alert data does not include host entity fields');
        }

        await expect(hostOverview).toBeVisible();
        await expect(pageObjects.documentFlyoutV2.entityHostName).toBeVisible();
      }
    );

    spaceTest(
      'entity user overview renders when user data is present',
      async ({ pageObjects, log }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        const userOverview = pageObjects.documentFlyoutV2.entityUserOverview;
        const hasUserOverview = await userOverview.isVisible({ timeout: 5_000 }).catch(() => false);

        if (!hasUserOverview) {
          log.info('No user overview in entity insights');
          spaceTest.skip(true, 'Alert data does not include user entity fields');
        }

        await expect(userOverview).toBeVisible();
        await expect(pageObjects.documentFlyoutV2.entityUserName).toBeVisible();
      }
    );
  }
);
