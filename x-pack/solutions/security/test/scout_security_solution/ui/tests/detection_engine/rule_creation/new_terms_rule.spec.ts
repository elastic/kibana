/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewTermsRule } from '../../../common/rule_objects';

test.describe(
  'New terms rule - Rule Creation',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Creates and enables a new terms rule', async ({ page, pageObjects }) => {
      const { ruleCreation } = pageObjects;
      const RULE_NAME = 'New Terms Rule Test';

      await test.step('Navigate to rule creation page', async () => {
        await ruleCreation.goto();
      });

      await test.step('Select new terms rule type', async () => {
        const newTermsType = page.testSubj.locator('newTermsRuleType');
        await newTermsType.click();
      });

      await test.step('Fill new terms define step', async () => {
        const newTermsFieldCombo = page.testSubj.locator('newTermsFieldsComboBox');
        if (await newTermsFieldCombo.isVisible()) {
          await newTermsFieldCombo.locator('input').fill('host.name');
          await page.getByRole('option', { name: 'host.name' }).first().click();
        }

        const historyWindowInput = page.testSubj.locator('historyWindowSize');
        if (await historyWindowInput.isVisible()) {
          await historyWindowInput.clear();
          await historyWindowInput.fill('7');
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

    test('Creates new terms rule via API and verifies on details page', async ({
      pageObjects,
      kbnClient,
    }) => {
      const rule = getNewTermsRule({ rule_id: `new-terms-${Date.now()}` });
      const created = await createRuleFromParams(kbnClient, rule);
      await pageObjects.ruleDetails.goto(created.id);
      await expect(pageObjects.ruleDetails.ruleNameHeader).toContainText(rule.name);
    });
  }
);
