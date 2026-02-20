/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../../fixtures';

// Failing: See https://github.com/elastic/kibana/issues/247693
test.describe.skip(
  'Custom Threshold Rule - Ad-hoc Data View',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const AD_HOC_DATA_VIEW_PATTERN = '.alerts-*';

    let testRuleName: string;
    let createdRuleId: string | undefined;

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      // Generate unique rule name for each test run to avoid conflicts
      testRuleName = `!!! - Scout - Custom threshold ad-hoc - ${Date.now()}`;
      await browserAuth.loginAsAdmin();
      await pageObjects.rulesPage.goto();
    });

    test.afterEach(async ({ apiServices }) => {
      // Clean up by rule name first (in case ID wasn't captured)
      try {
        const rulesResponse = await apiServices.alerting.rules.find({
          search: testRuleName,
        });
        if (rulesResponse.data?.data && rulesResponse.data.data.length > 0) {
          for (const rule of rulesResponse.data.data) {
            if (rule.name === testRuleName) {
              await apiServices.alerting.rules.delete(rule.id).catch(() => {});
            }
          }
        }
      } catch {
        // Ignore errors if rule doesn't exist
      }

      // Also try cleaning up by ID if we have it
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
      await pageObjects.rulesPage.setRuleName(testRuleName);

      // Type the pattern to trigger "Explore matching indices" button
      await pageObjects.rulesPage.setIndexPatternAndWaitForButton(AD_HOC_DATA_VIEW_PATTERN);

      // Click the button to create an ad-hoc data view
      await pageObjects.rulesPage.clickExploreMatchingIndices();

      // Verify the data view was selected
      const dataViewText = await pageObjects.rulesPage.dataViewExpression.textContent();
      expect(dataViewText).toContain(AD_HOC_DATA_VIEW_PATTERN);

      // Wait for form to fully initialize with default criteria
      await pageObjects.rulesPage.waitForFormReady();

      // Save the rule (navigates to rule details page)
      await pageObjects.rulesPage.saveRule();

      // Navigate back to rules list to verify the rule was created
      await pageObjects.rulesPage.goto();

      // Fetch the rule via API to verify it was created correctly
      const rulesResponse = await apiServices.alerting.rules.find({
        search: testRuleName,
      });

      expect(rulesResponse.data?.data).toBeDefined();
      expect(rulesResponse.data?.data?.length).toBeGreaterThan(0);

      const createdRule = rulesResponse.data?.data?.[0];
      expect(createdRule).toBeDefined();
      expect(createdRule.name).toBe(testRuleName);

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
  }
);
