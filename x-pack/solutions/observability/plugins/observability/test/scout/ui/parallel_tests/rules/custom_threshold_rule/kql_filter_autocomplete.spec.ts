/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../../fixtures';

test.describe(
  'Custom Threshold Rule - KQL Filter Autocomplete',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.rulesPage.goto();

      // Open rule type modal and select custom threshold
      await pageObjects.rulesPage.openRuleTypeModal();
      await pageObjects.rulesPage.clickCustomThresholdRuleType();
    });

    test('should show KQL autocomplete suggestions when typing in the filter field', async ({
      pageObjects,
    }) => {
      // Set up a data view first - autocomplete needs field metadata from a data view
      await pageObjects.rulesPage.setIndexPatternAndWaitForButton('.alerts-*');
      await pageObjects.rulesPage.clickExploreMatchingIndices();

      // Open the metric row popover
      await pageObjects.rulesPage.openMetricRowPopover();

      // Select COUNT aggregation to show the KQL filter field
      await pageObjects.rulesPage.selectCountAggregation();

      // Verify the KQL search field is visible
      await expect(pageObjects.rulesPage.kqlSearchField).toBeVisible();

      // Type in the KQL filter to trigger autocomplete
      await pageObjects.rulesPage.typeInKqlFilter('host');

      // Verify that suggestions panel appears (autocomplete is working)
      await expect(pageObjects.rulesPage.kqlSuggestionsPanel).toBeVisible({ timeout: 10000 });
    });
  }
);
