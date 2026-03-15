/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewMachineLearningRule } from '../../../common/rule_objects';

test.describe(
  'Machine learning rule - Rule Creation',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Creates and enables an ML rule', async ({ page, pageObjects }) => {
      const { ruleCreation } = pageObjects;
      const RULE_NAME = 'ML Rule Test';

      await test.step('Navigate to rule creation page', async () => {
        await ruleCreation.goto();
      });

      await test.step('Select ML rule type', async () => {
        const mlRuleType = page.testSubj.locator('machineLearningRuleType');
        await mlRuleType.click();
      });

      await test.step('Fill ML define step', async () => {
        const mlJobCombo = page.testSubj.locator('mlJobSelect');
        await mlJobCombo.locator('input').fill('v3_linux_anomalous_network_activity');
        await page
          .getByRole('option', { name: /linux_anomalous_network_activity/i })
          .first()
          .click();

        const anomalyThresholdInput = page.testSubj
          .locator('anomalyThresholdSlider')
          .locator('input[type="range"]');
        if (await anomalyThresholdInput.isVisible()) {
          await anomalyThresholdInput.fill('20');
        }

        await ruleCreation.clickContinue();
      });

      await test.step('Fill about step', async () => {
        await ruleCreation.fillRuleName(RULE_NAME);
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

    test('Creates ML rule via API and verifies on details page', async ({
      pageObjects,
      kbnClient,
    }) => {
      const rule = getNewMachineLearningRule({ rule_id: `ml-${Date.now()}` });
      const created = await createRuleFromParams(kbnClient, rule);
      await pageObjects.ruleDetails.goto(created.id);
      await expect(pageObjects.ruleDetails.ruleNameHeader).toContainText(rule.name);
    });
  }
);
