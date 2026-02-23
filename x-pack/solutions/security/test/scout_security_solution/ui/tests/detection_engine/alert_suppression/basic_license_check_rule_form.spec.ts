/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, startBasicLicense } from '../../../common/api_helpers';

test.describe('Basic license check rule form', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
    await browserAuth.loginAsAdmin();
    await deleteAlertsAndRules(apiServices);
    await startBasicLicense(kbnClient);
  });

  test('Cannot create rule with suppression on basic license', async ({ page, pageObjects }) => {
    await pageObjects.ruleCreation.goto();

    await test.step('Default custom query rule - suppression fields disabled', async () => {
      const suppressionFieldsInput = page.testSubj.locator('alertSuppressionInput');
      await suppressionFieldsInput.hover();
      await expect(page.getByRole('tooltip')).toContainText('Platinum license');
    });

    await test.step('Indicator match rule - suppression fields disabled', async () => {
      await pageObjects.ruleCreation.selectRuleType('Indicator Match');
      const suppressionFieldsInput = page.testSubj.locator('alertSuppressionInput');
      await suppressionFieldsInput.hover();
      await expect(page.getByRole('tooltip')).toContainText('Platinum license');
    });

    await test.step('New terms rule - suppression fields disabled', async () => {
      await pageObjects.ruleCreation.selectRuleType('New Terms');
      const suppressionFieldsInput = page.testSubj.locator('alertSuppressionInput');
      await suppressionFieldsInput.hover();
      await expect(page.getByRole('tooltip')).toContainText('Platinum license');
    });

    await test.step('ES|QL rule - suppression fields disabled', async () => {
      await pageObjects.ruleCreation.selectRuleType('ES|QL');
      const suppressionFieldsInput = page.testSubj.locator('alertSuppressionInput');
      await suppressionFieldsInput.hover();
      await expect(page.getByRole('tooltip')).toContainText('Platinum license');
    });

    await test.step('EQL rule - suppression fields disabled', async () => {
      await pageObjects.ruleCreation.selectRuleType('Event Correlation');
      const suppressionFieldsInput = page.testSubj.locator('alertSuppressionInput');
      await expect(suppressionFieldsInput).toBeDisabled();
      await page.testSubj.locator('alertSuppressionFields').hover();
      await expect(page.getByRole('tooltip')).toContainText('Platinum license');
    });

    await test.step('ML rule type is disabled on basic license', async () => {
      const mlRuleType = page.testSubj.locator('machineLearningRuleType');
      await expect(mlRuleType.getByRole('button')).toBeDisabled();
    });

    await test.step('Threshold rule - suppression checkbox disabled', async () => {
      await pageObjects.ruleCreation.selectRuleType('Threshold');
      const suppressionCheckbox = page.testSubj.locator('thresholdEnableSuppressionCheckbox');
      await expect(suppressionCheckbox).toBeDisabled();
      await suppressionCheckbox.locator('..').hover();
      await expect(page.getByRole('tooltip')).toContainText('Platinum license');
    });
  });
});
