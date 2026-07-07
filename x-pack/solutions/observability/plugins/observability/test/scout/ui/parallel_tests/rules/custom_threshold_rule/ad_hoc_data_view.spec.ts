/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../../fixtures';
import { deleteRuleByName } from '../../../fixtures/helpers';

test.describe(
  'Custom Threshold Rule - Ad-hoc Data View',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const AD_HOC_DATA_VIEW_PATTERN = '.alerts-*';

    // Use a distinct prefix to avoid search collisions with global-setup rules
    let testRuleName: string;

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      testRuleName = `@@@ - Scout - Custom threshold ad-hoc - ${Date.now()}`;
      await browserAuth.loginAsAdmin();
      await pageObjects.rulesPage.goto();
    });

    test.afterEach(async ({ apiServices }) => {
      await deleteRuleByName(apiServices, testRuleName);
    });

    test('should create a custom threshold rule with an ad-hoc data view', async ({
      pageObjects,
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

      // Verify the rule details page loaded with the correct name and type
      await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();
      await expect(pageObjects.ruleDetailsPage.ruleName).toHaveText(testRuleName);
      await expect(pageObjects.ruleDetailsPage.ruleType).toContainText('Custom threshold');
    });
  }
);
