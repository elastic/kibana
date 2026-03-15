/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';

test.describe(
  'Rule Overrides - Rule Creation',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    const RULE_NAME = 'Override Rule';

    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Creates a new custom rule with override options', async ({ page, pageObjects }) => {
      const { ruleCreation } = pageObjects;

      await test.step('Navigate to rule creation page', async () => {
        await ruleCreation.goto();
      });

      await test.step('Fill define step and continue', async () => {
        await ruleCreation.clickContinue();
      });

      await test.step('Fill about step with override fields', async () => {
        await ruleCreation.fillRuleName(RULE_NAME);

        const advancedSettings = page.getByText('Advanced settings');
        await advancedSettings.click();

        const severityOverrideToggle = page.testSubj.locator('severityOverrideToggle');
        if (await severityOverrideToggle.isVisible()) {
          await severityOverrideToggle.click();

          const severityMappingField = page.testSubj.locator('severityOverride-ifField-0');
          await severityMappingField.fill('event.severity');
          await page.getByRole('option', { name: 'event.severity' }).click();

          const severityMappingValue = page.testSubj.locator('severityOverride-ifValue-0');
          await severityMappingValue.fill('1');
        }

        const riskScoreOverrideToggle = page.testSubj.locator('riskScoreOverrideToggle');
        if (await riskScoreOverrideToggle.isVisible()) {
          await riskScoreOverrideToggle.click();

          const riskScoreMappingField = page.testSubj.locator('riskScoreOverride-ifField-0');
          await riskScoreMappingField.fill('event.risk_score');
          await page.getByRole('option', { name: 'event.risk_score' }).click();
        }

        const nameOverrideToggle = page.testSubj.locator('ruleNameOverrideToggle');
        if (await nameOverrideToggle.isVisible()) {
          await nameOverrideToggle.click();

          const nameOverrideField = page.testSubj.locator('ruleNameOverride');
          await nameOverrideField.fill('message');
          await page.getByRole('option', { name: 'message' }).click();
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
