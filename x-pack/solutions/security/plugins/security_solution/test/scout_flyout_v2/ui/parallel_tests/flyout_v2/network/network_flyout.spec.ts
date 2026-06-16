/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout UI tests for the flyout_v2 network flyout.
 *
 * Entry path: Alerts table → click an IP cell (source.ip) → network flyout opens via the
 * formatted-IP cell renderer.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE, PREVALENCE_SOURCE_IP } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Network flyout v2',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      // Index a source event carrying `source.ip` and scope the rule to that index, so the alert
      // deterministically renders an IP cell (and isn't affected by other parallel-worker data).
      const { sourceIndex } = await apiServices.prevalence.createPrevalenceFixture(scoutSpace.id);

      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
        index: [sourceIndex],
      });
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices, scoutSpace }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
      await apiServices.prevalence.cleanupPrevalenceFixture(scoutSpace.id);
    });

    spaceTest('opens from IP cell click in alerts table', async ({ pageObjects, page }) => {
      await pageObjects.alertsTablePage.navigate();
      await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);

      // The source.ip column renders the IP as a clickable network-details cell.
      await pageObjects.alertsTablePage.clickNetworkIpCell(PREVALENCE_SOURCE_IP);

      // Network flyout opens, titled with the clicked IP.
      await expect(page.getByTestId('network-details-flyout-headerText')).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByTestId('network-details-flyout-headerText')).toContainText(
        PREVALENCE_SOURCE_IP
      );
    });
  }
);
