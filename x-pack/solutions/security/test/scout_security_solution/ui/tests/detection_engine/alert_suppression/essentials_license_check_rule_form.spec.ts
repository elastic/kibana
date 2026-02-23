/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';

test.describe(
  'Essentials license check rule form',
  {
    tag: [...tags.serverless.security.essentials],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Alert suppression is enabled for essentials tier', async ({ page, pageObjects }) => {
      await pageObjects.ruleCreation.goto();

      await test.step('Custom query rule - suppression fields enabled', async () => {
        const suppressionFieldsInput = page.testSubj.locator('alertSuppressionInput');
        await expect(suppressionFieldsInput).toBeEnabled();
      });

      await test.step('Indicator match rule - suppression fields enabled', async () => {
        await pageObjects.ruleCreation.selectRuleType('Indicator Match');
        const suppressionFieldsInput = page.testSubj.locator('alertSuppressionInput');
        await expect(suppressionFieldsInput).toBeEnabled();
      });

      await test.step('New terms rule - suppression fields enabled', async () => {
        await pageObjects.ruleCreation.selectRuleType('New Terms');
        const suppressionFieldsInput = page.testSubj.locator('alertSuppressionInput');
        await expect(suppressionFieldsInput).toBeEnabled();
      });

      await test.step('Threshold rule - suppression checkbox enabled', async () => {
        await pageObjects.ruleCreation.selectRuleType('Threshold');
        const suppressionCheckbox = page.testSubj.locator('thresholdEnableSuppressionCheckbox');
        await expect(suppressionCheckbox).toBeEnabled();
      });

      await test.step('ES|QL rule - suppression fields enabled', async () => {
        await pageObjects.ruleCreation.selectRuleType('ES|QL');
        const suppressionFieldsInput = page.testSubj.locator('alertSuppressionInput');
        await expect(suppressionFieldsInput).toBeEnabled();
      });

      await test.step('ML rule type is disabled on essentials tier', async () => {
        const mlRuleType = page.testSubj.locator('machineLearningRuleType');
        await expect(mlRuleType.getByRole('button')).toBeDisabled();
      });
    });
  }
);
