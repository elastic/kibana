/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, test } from '@kbn/scout-security';

const RIGHT = 'right';

test.describe('Expandable flyout state sync', { tag: ['@svlSecurity'] }, () => {
  test.beforeEach(async ({ browserAuth, detectionRuleApi }) => {
    await detectionRuleApi.deleteAll();
    await detectionRuleApi.createCustomQueryRule();
    await browserAuth.loginAsPlatformEngineer();
  });

  test('should test flyout url sync', async ({ pageObjects: { alertsTablePage } }) => {
    await alertsTablePage.navigate();
    
    const urlBeforeAlertDetails = await alertsTablePage.getCurrentUrl();
    expect(urlBeforeAlertDetails).not.toContain(RIGHT);
    
    await alertsTablePage.expandAlertDetailsFlyout();
    
    const urlAfterAlertDetails = await alertsTablePage.getCurrentUrl();
    expect(urlAfterAlertDetails).toContain(RIGHT);

    
  });
});
