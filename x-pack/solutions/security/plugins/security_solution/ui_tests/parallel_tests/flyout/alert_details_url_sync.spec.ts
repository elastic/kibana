/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, spaceTest } from '@kbn/scout-security';
import { CUSTOM_QUERY_RULE } from '@kbn/scout-security/src/playwright/constants/detection_rules';

const RIGHT = 'right';

spaceTest.describe('Expandable flyout state sync', { tag: ['@ess', '@svlSecurity '] }, () => {
  spaceTest.beforeEach(async ({ browserAuth, apiServices }) => {
    await apiServices.detectionRule.deleteAll();
    await apiServices.detectionRule.createCustomQueryRule(CUSTOM_QUERY_RULE);
    await browserAuth.loginAsPlatformEngineer();
  });

  spaceTest('should test flyout url sync', async ({ pageObjects }) => {
    await pageObjects.alertsTablePage.navigate();

    const urlBeforeAlertDetails = await pageObjects.alertsTablePage.getCurrentUrl();
    expect(urlBeforeAlertDetails).not.toContain(RIGHT);

    await pageObjects.alertsTablePage.expandFirstAlertDetailsFlyout();

    const urlAfterAlertDetails = await pageObjects.alertsTablePage.getCurrentUrl();
    expect(urlAfterAlertDetails).toContain(RIGHT);

    const headerTitle = pageObjects.alertDetailsRightPanelPage.detailsFlyoutHeaderTitle;
    await expect(headerTitle).toHaveText(CUSTOM_QUERY_RULE.name);

    await pageObjects.alertsTablePage.reload();

    const urlAfterReload = await pageObjects.alertsTablePage.getCurrentUrl();
    expect(urlAfterReload).toContain(RIGHT);

    await pageObjects.alertDetailsRightPanelPage.closeFlyout();

    const urlAfterClosingFlyout = await pageObjects.alertsTablePage.getCurrentUrl();
    expect(urlAfterClosingFlyout).not.toContain(RIGHT);
  });
});
