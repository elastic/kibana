/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, spaceTest } from '@kbn/scout-security';
import { CUSTOM_QUERY_RULE } from '@kbn/scout-security/src/playwright/constants/detection_rules';

const RIGHT = 'right';

spaceTest.describe('Expandable flyout state sync', { tag: ['@ess', '@svlSecurity'] }, () => {
  let ruleName: string;
  spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
    ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;

    // Create the rule with a more recent 'from' time to catch new data
    const ruleWithRecentFromTime = {
      ...CUSTOM_QUERY_RULE,
      name: ruleName,
      from: 'now-1m', // Look for data from the last minute
    };
    await apiServices.detectionRule.createCustomQueryRule(ruleWithRecentFromTime);

    // Generate test data that will trigger the rule
    await apiServices.detectionRule.indexTestDocument('logs-test', {
      'event.category': 'security',
      'event.type': 'alert',
      message: 'Test security event for detection rule',
      'host.name': 'test-host',
      'user.name': 'test-user',
    });

    // Wait for the rule to execute (detection rules typically run every 1-5 minutes)
    // In test environments, this might be faster
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

    await browserAuth.loginAsPlatformEngineer();
  });

  spaceTest.afterEach(async ({ apiServices }) => {
    await apiServices.detectionRule.deleteAll();
  });

  spaceTest('should test flyout url sync', async ({ pageObjects, page }) => {
    await pageObjects.alertsTablePage.navigate();

    const urlBeforeAlertDetails = page.url();
    expect(urlBeforeAlertDetails).not.toContain(RIGHT);

    await pageObjects.alertsTablePage.waitForDetectionsAlertsWrapper();
    await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);

    const urlAfterAlertDetails = page.url();
    expect(urlAfterAlertDetails).toContain(RIGHT);

    const headerTitle = pageObjects.alertDetailsRightPanelPage.detailsFlyoutHeaderTitle;
    await expect(headerTitle).toHaveText(ruleName);

    await page.reload();
    await pageObjects.alertsTablePage.waitForDetectionsAlertsWrapper();

    const urlAfterReload = page.url();
    expect(urlAfterReload).toContain(RIGHT);

    await pageObjects.alertDetailsRightPanelPage.closeFlyout();

    const urlAfterClosingFlyout = page.url();
    expect(urlAfterClosingFlyout).not.toContain(RIGHT);
  });
});
