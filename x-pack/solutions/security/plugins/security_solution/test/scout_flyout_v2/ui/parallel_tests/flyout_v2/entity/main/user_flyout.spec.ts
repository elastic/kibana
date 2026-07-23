/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout UI tests for the flyout_v2 user entity flyout (main panel).
 *
 * Entry path: Alerts page → alerts table user.name cell → click the user → the user flyout opens.
 *
 * Entity Store V2 is enabled by default (a readonly feature flag), so the flyout renders in
 * entity-store mode. The user seeded here is not in the entity store, so this covers the sections
 * that render in that state: the header, observed data and footer actions. Entity-store-backed
 * sections (risk summary, asset criticality, risk-inputs tool, entity store tabs/visualizations)
 * and the CSP misconfiguration/vulnerability tools require seeding the entity store / CSP findings
 * and are intentionally out of scope here.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE, USER_NAME } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'User entity flyout v2',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }, testInfo) => {
      // Rule execution can be slow under parallel load.
      testInfo.setTimeout(testInfo.timeout + 90_000);

      // Index a source event carrying `user.name` and scope the rule to that index, so the alert
      // deterministically renders a clickable user cell (and isn't affected by other workers' data).
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

    spaceTest(
      'opens from the alerts table user cell and renders the main sections',
      async ({ pageObjects }) => {
        const { alertsTablePage, userFlyout } = pageObjects;

        await alertsTablePage.navigate();
        await alertsTablePage.waitForRuleAlert(ruleName);

        await spaceTest.step('clicking the user.name value opens the user flyout', async () => {
          await alertsTablePage.clickUserNameCell(USER_NAME);
          await userFlyout.waitForUserFlyout();
        });

        await spaceTest.step('header shows the user name, type and source badges', async () => {
          await expect.soft(userFlyout.title).toContainText(USER_NAME);
          await expect.soft(userFlyout.entityTypeBadge).toContainText('User');
          await expect.soft(userFlyout.observedBadge).toBeVisible();
        });

        await spaceTest.step('observed data section renders', async () => {
          await expect.soft(userFlyout.observedAccordion).toBeVisible();
        });

        await spaceTest.step('footer shows the take action button', async () => {
          await expect.soft(userFlyout.takeActionButton).toBeVisible();
        });
      }
    );
  }
);
