/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewIndicatorMatchRule } from '../../../common/rule_objects';

test.describe(
  'Indicator match rule - Rule Creation',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Creates and enables an indicator match rule', async ({ page, pageObjects }) => {
      const { ruleCreation } = pageObjects;
      const RULE_NAME = 'Indicator Match Rule Test';

      await test.step('Navigate to rule creation page', async () => {
        await ruleCreation.goto();
      });

      await test.step('Select indicator match rule type', async () => {
        const indicatorMatchType = page.testSubj.locator('threatMatchRule');
        await indicatorMatchType.click();
      });

      await test.step('Fill indicator match define step', async () => {
        const indicatorIndexCombo = page.testSubj.locator('comboBoxInput').nth(1);
        await indicatorIndexCombo.fill('threat-indicator-*');
        await page.keyboard.press('Enter');

        const indicatorMappingField = page.testSubj.locator('indicatorMappingComboField');
        if (await indicatorMappingField.isVisible()) {
          await indicatorMappingField.locator('input').first().fill('host.name');
          await page.getByRole('option', { name: 'host.name' }).first().click();
        }

        const indicatorMappingValue = page.testSubj.locator('indicatorMappingValueField');
        if (await indicatorMappingValue.isVisible()) {
          await indicatorMappingValue.locator('input').first().fill('threat.indicator.ip');
          await page.getByRole('option', { name: 'threat.indicator.ip' }).first().click();
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

    test('Creates indicator match rule via API and verifies on details page', async ({
      pageObjects,
      kbnClient,
    }) => {
      const rule = getNewIndicatorMatchRule({ rule_id: `indicator-${Date.now()}` });
      const created = await createRuleFromParams(kbnClient, rule);
      await pageObjects.ruleDetails.goto(created.id);
      await expect(pageObjects.ruleDetails.ruleNameHeader).toContainText(rule.name);
    });
  }
);
