/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../../fixtures';

test.describe('Custom Threshold Rule - Ad-hoc Data View', { tag: ['@ess', '@svlOblt'] }, () => {
  const AD_HOC_DATA_VIEW_PATTERN = '.alerts-*';
  const CUSTOM_THRESHOLD_RULE_NAME = '!!! - Scout - Custom threshold with ad-hoc data view';

  let createdRuleId: string | undefined;

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.rulesPage.goto();
  });

  test.afterEach(async ({ apiServices }) => {
    // Clean up the rule created during the test
    if (createdRuleId) {
      try {
        await apiServices.alerting.rules.delete(createdRuleId);
      } catch {
        // Rule might not exist, ignore
      }
      createdRuleId = undefined;
    }
  });

  test('should create a custom threshold rule with an ad-hoc data view', async ({
    pageObjects,
    apiServices,
  }) => {
    // Open rule type modal
    await pageObjects.rulesPage.openRuleTypeModal();

    // Select custom threshold rule type
    await pageObjects.rulesPage.clickCustomThresholdRuleType();

    // Set rule name
    await pageObjects.rulesPage.setRuleName(CUSTOM_THRESHOLD_RULE_NAME);

    // Type the pattern to trigger "Explore matching indices" button
    await pageObjects.rulesPage.setIndexPatternAndWaitForButton(AD_HOC_DATA_VIEW_PATTERN);

    // Click the button to create an ad-hoc data view and verify it was selected
    await pageObjects.rulesPage.clickExploreMatchingIndices(AD_HOC_DATA_VIEW_PATTERN);

    // Save the rule (navigates to rule details page)
    await pageObjects.rulesPage.saveRule();

    // Navigate back to rules list to verify the rule was created
    await pageObjects.rulesPage.goto();

    // Fetch the rule via API to verify it was created correctly
    const rulesResponse = await apiServices.alerting.rules.find({
      search: CUSTOM_THRESHOLD_RULE_NAME,
    });

    expect(rulesResponse.data?.data).toBeDefined();
    expect(rulesResponse.data?.data?.length).toBeGreaterThan(0);

    const createdRule = rulesResponse.data?.data?.[0];
    expect(createdRule).toBeDefined();
    expect(createdRule.name).toBe(CUSTOM_THRESHOLD_RULE_NAME);

    // Store the rule ID for cleanup
    createdRuleId = createdRule.id;

    // Verify the ad-hoc data view was set correctly in the rule params
    const searchConfig = createdRule.params.searchConfiguration;
    expect(searchConfig).toBeDefined();
    expect(searchConfig.index).toBeDefined();

    // Ad-hoc data views should be objects with a title property
    expect(typeof searchConfig.index).toBe('object');
    expect(searchConfig.index).not.toBeNull();
    expect((searchConfig.index as { title: string }).title).toBe(AD_HOC_DATA_VIEW_PATTERN);
  });
});
