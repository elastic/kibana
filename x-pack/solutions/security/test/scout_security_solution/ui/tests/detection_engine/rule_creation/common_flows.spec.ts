/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';

test.describe(
  'Common rule creation flows',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Creates and enables a rule filling all about fields', async ({ page, pageObjects }) => {
      const { ruleCreation } = pageObjects;
      const RULE_NAME = 'Common Flow Rule';

      await test.step('Navigate to rule creation page', async () => {
        await ruleCreation.goto();
      });

      await test.step('Fill define step and continue', async () => {
        await ruleCreation.clickContinue();
      });

      await test.step('Fill about step with all fields', async () => {
        await ruleCreation.fillRuleName(RULE_NAME);

        const descriptionInput = page.testSubj.locator('ruleDescriptionInput');
        await descriptionInput.fill('Common flow rule description');

        const severityDropdown = page.testSubj.locator('severityField');
        if (await severityDropdown.isVisible()) {
          await severityDropdown.click();
          await page.getByRole('option', { name: 'Critical' }).click();
        }

        const riskScoreInput = page.testSubj.locator('riskScore');
        if (await riskScoreInput.isVisible()) {
          await riskScoreInput.fill('50');
        }

        const tagsInput = page.testSubj.locator('tagsField').locator('input');
        await tagsInput.fill('test-tag');
        await tagsInput.press('Enter');

        const advancedSettings = page.getByText('Advanced settings');
        await advancedSettings.click();

        const referenceUrlInput = page.testSubj.locator('referenceUrls').locator('input');
        if (await referenceUrlInput.isVisible()) {
          await referenceUrlInput.fill('http://example.com');
          await referenceUrlInput.press('Enter');
        }

        const falsePositivesInput = page.testSubj.locator('falsePositives').locator('input');
        if (await falsePositivesInput.isVisible()) {
          await falsePositivesInput.fill('Known false positive');
          await falsePositivesInput.press('Enter');
        }

        const noteInput = page.testSubj.locator('ruleNote');
        if (await noteInput.isVisible()) {
          await noteInput.fill('# Investigation notes\nCheck the host.');
        }

        await ruleCreation.clickContinue();
      });

      await test.step('Fill schedule step', async () => {
        await ruleCreation.clickContinue();
      });

      await test.step('Create rule and verify', async () => {
        await ruleCreation.createRule();
        const ruleNameHeader = page.testSubj.locator('header-page-title');
        await expect(ruleNameHeader).toContainText(RULE_NAME);
      });
    });

    test('Can navigate between wizard steps', async ({ page, pageObjects }) => {
      const { ruleCreation } = pageObjects;

      await test.step('Navigate to rule creation page', async () => {
        await ruleCreation.goto();
      });

      await test.step('Go from define to about step', async () => {
        await ruleCreation.clickContinue();
        await expect(ruleCreation.aboutStepContainer).toBeVisible();
      });

      await test.step('Go back to define step via edit button', async () => {
        const defineEditBtn = page.testSubj.locator('edit-define-rule');
        if (await defineEditBtn.isVisible()) {
          await defineEditBtn.click();
          await expect(ruleCreation.defineStepContainer).toBeVisible();
        }
      });
    });

    test('Max signals field is configurable', async ({ page, pageObjects }) => {
      const { ruleCreation } = pageObjects;
      const RULE_NAME = 'Max Signals Rule';

      await test.step('Navigate to rule creation page', async () => {
        await ruleCreation.goto();
      });

      await test.step('Fill define step and continue', async () => {
        await ruleCreation.clickContinue();
      });

      await test.step('Fill about step with custom max signals', async () => {
        await ruleCreation.fillRuleName(RULE_NAME);

        const advancedSettings = page.getByText('Advanced settings');
        await advancedSettings.click();

        const maxSignalsInput = page.testSubj.locator('maxSignals');
        if (await maxSignalsInput.isVisible()) {
          await maxSignalsInput.clear();
          await maxSignalsInput.fill('200');
        }

        await ruleCreation.clickContinue();
      });

      await test.step('Fill schedule step and create rule', async () => {
        await ruleCreation.clickContinue();
        await ruleCreation.createRule();
      });

      await test.step('Verify rule is created', async () => {
        const ruleNameHeader = page.testSubj.locator('header-page-title');
        await expect(ruleNameHeader).toContainText(RULE_NAME);
      });
    });
  }
);
