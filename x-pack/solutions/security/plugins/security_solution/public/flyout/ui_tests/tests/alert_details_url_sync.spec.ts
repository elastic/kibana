/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout-security';

test.describe('test', { tag: ['@svlSecurity'] }, () => {
  test.beforeEach(async ({ browserAuth, detectionRuleApi }) => {
    await detectionRuleApi.deleteAll();
    await detectionRuleApi.createCustomQueryRule();
    await browserAuth.loginAsPlatformEngineer();
  });

  test('body of the test', async ({ pageObjects: { entityAnalyticsPage } }) => {
    await entityAnalyticsPage.navigate();
  });
});
