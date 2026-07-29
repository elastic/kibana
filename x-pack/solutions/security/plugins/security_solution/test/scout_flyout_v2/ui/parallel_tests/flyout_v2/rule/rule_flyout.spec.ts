/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout UI test for the flyout_v2 rule flyout.
 *
 * Entry path: Alerts page → alerts table "Rule" column → click the rule name → the v2 rule
 * flyout opens.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Rule flyout v2',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
        index: ['auditbeat-*'],
      });
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
    });

    spaceTest('rule name in the alerts table opens the rule flyout v2', async ({ pageObjects }) => {
      await pageObjects.alertsTablePage.navigate();
      await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);

      // Click the rule name link in the "Rule" column.
      await pageObjects.alertsTablePage.clickRuleName(ruleName);

      // The v2 rule flyout opens, titled with the rule name.
      await expect(pageObjects.ruleFlyout.title).toBeVisible({
        timeout: 15_000,
      });
      await expect(pageObjects.ruleFlyout.title).toContainText(ruleName);
    });
  }
);
