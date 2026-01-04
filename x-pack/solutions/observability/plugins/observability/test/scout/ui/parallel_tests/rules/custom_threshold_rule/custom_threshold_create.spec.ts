/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { test } from '../../../fixtures';

test.describe('Create Custom Threshold', { tag: ['@ess', '@svlOblt'] }, () => {
  // const createCustomThresholdTestSubj = 'thresholdRuleCreate';

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();

    await pageObjects.rulesPage.goto();

    await pageObjects.rulesPage.createRuleButton.click();
    await pageObjects.rulesPage.observabilityCategory.click();
    await pageObjects.rulesPage.customThresholdRuleTypeCard.click();
  });
});
