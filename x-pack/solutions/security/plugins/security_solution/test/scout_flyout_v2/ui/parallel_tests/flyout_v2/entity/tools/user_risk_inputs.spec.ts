/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout UI test for the user entity flyout's Risk Inputs tool (a stacked system flyout).
 *
 * Entry path: Alerts page → alerts table user.name cell → user flyout (entity in store) → risk
 * summary section → "Entity risk contributions" link → Risk Inputs tool.
 *
 * Requires the entity store to be running and the user to be present in it so the flyout renders
 * in entity-store mode and displays the risk summary section. The entity store is installed per
 * space (space-isolated workers) so parallel workers never interfere.
 *
 * Entity store installation and cleanup are suite-scoped because both tests reuse the same user.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE, USER_HOST_ID, USER_NAME } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'User entity flyout v2 - Risk Inputs tool',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeAll(async ({ apiServices }) => {
      spaceTest.setTimeout(180_000);
      await apiServices.entityAnalytics.deleteEntityStoreEngines();
      await apiServices.entityAnalytics.installEntityStoreV2(['user']);
      await apiServices.entityAnalytics.indexEntityStoreEntry(
        `user:${USER_NAME}@${USER_HOST_ID}@local`,
        USER_NAME,
        {
          entityType: 'user',
          hostId: USER_HOST_ID,
          namespace: 'local',
        }
      );
    });

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }, testInfo) => {
      // Rule execution can be slow under parallel load.
      testInfo.setTimeout(testInfo.timeout + 120_000);

      const { sourceIndex } = await apiServices.user.createUserFixture(scoutSpace.id);

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

    spaceTest.afterAll(async ({ apiServices }) => {
      spaceTest.setTimeout(120_000);
      await apiServices.entityAnalytics.deleteEntityStoreEngines();
    });

    spaceTest(
      'risk inputs tool opens and shows the user name in the header',
      async ({ pageObjects }) => {
        const { alertsTablePage, userFlyout } = pageObjects;
        await alertsTablePage.navigate();
        await alertsTablePage.waitForRuleAlert(ruleName);
        await alertsTablePage.clickUserNameCell(USER_NAME);
        await userFlyout.waitForUserFlyout();

        // The risk summary section renders when the entity is in the store. Clicking the
        // "Entity risk contributions" header link opens the Risk Inputs tool.
        await userFlyout.openRiskInputsTool();

        await spaceTest.step('risk inputs tool body is visible', async () => {
          await expect(userFlyout.riskInputsTool).toBeVisible({ timeout: 15_000 });
        });

        await spaceTest.step('tool header shows the user name', async () => {
          await expect(userFlyout.toolsFlyoutTitle).toContainText(USER_NAME);
        });
      }
    );

    spaceTest('header title opens the user as a child flyout', async ({ pageObjects }) => {
      const { alertsTablePage, userFlyout } = pageObjects;
      await alertsTablePage.navigate();
      await alertsTablePage.waitForRuleAlert(ruleName);
      await alertsTablePage.clickUserNameCell(USER_NAME);
      await userFlyout.waitForUserFlyout();
      await userFlyout.openRiskInputsTool();

      // The tool header's source-context title shows the user name. Clicking it opens the
      // originating user flyout as a stacked child.
      await expect(userFlyout.toolsFlyoutTitle).toContainText(USER_NAME);
      await expect(userFlyout.header).toHaveCount(1);

      await userFlyout.toolsFlyoutTitle.click();
      await expect(userFlyout.header).toHaveCount(2);
      await expect(userFlyout.title.filter({ hasText: USER_NAME })).toHaveCount(2);
    });
  }
);
