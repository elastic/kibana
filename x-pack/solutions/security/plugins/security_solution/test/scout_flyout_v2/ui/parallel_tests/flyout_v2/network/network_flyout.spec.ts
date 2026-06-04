/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout UI tests for the flyout_v2 network flyout.
 *
 * Entry path: Alerts table → click an IP cell (source.ip / destination.ip) →
 *   network flyout opens via the formatted-IP cell renderer.
 *
 * NOTE: Requires alert data with source.ip / destination.ip fields (auditbeat archive).
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Network flyout v2',
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

    spaceTest('opens from IP cell click in alerts table', async ({ pageObjects, page, log }) => {
      await pageObjects.alertsTablePage.navigate();
      await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);

      // Find IP cells in the alerts table (source.ip or destination.ip)
      const ipCells = await pageObjects.alertsTablePage.alertsTable
        .getByTestId('network-details')
        .all();

      if (ipCells.length === 0) {
        log.info('No IP cells in current alerts data');
        spaceTest.skip(true, 'Alert data does not include source.ip / destination.ip fields');
      }

      await ipCells[0].click();

      // Network flyout header should appear
      await expect(page.getByTestId('network-details-flyout-header')).toBeVisible({
        timeout: 10_000,
      });
    });
  }
);
