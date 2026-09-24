/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout UI test for the flyout_v2 host entity flyout (main panel).
 *
 * Entry path: Alerts page → alerts table host.name cell → click the host → the host flyout opens.
 *
 * The test is intentionally limited to the alerts-table integration path. Component-level tests
 * cover the flyout's badges, sections, and footer actions.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE, HOST_NAME } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Host entity flyout v2',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }, testInfo) => {
      // Rule execution can be slow under parallel load.
      testInfo.setTimeout(testInfo.timeout + 90_000);

      // Index a source event carrying `host.name` and scope the rule to that index, so the alert
      // deterministically renders a clickable host cell (and isn't affected by other workers' data).
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

    spaceTest('opens from the alerts table host cell', async ({ pageObjects }) => {
      const { alertsTablePage, hostFlyout } = pageObjects;

      await alertsTablePage.navigate();
      await alertsTablePage.waitForRuleAlert(ruleName);

      await spaceTest.step('clicking the host.name value opens the host flyout', async () => {
        await alertsTablePage.clickHostNameCell(HOST_NAME);
        await hostFlyout.waitForHostFlyout();
      });

      await expect(hostFlyout.title).toContainText(HOST_NAME);
    });
  }
);
