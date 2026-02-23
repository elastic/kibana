/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewEsqlRule } from '../../../common/rule_objects';

test.describe(
  'ES|QL rule - Rule Creation',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Creates and enables an ES|QL rule', async ({ page, pageObjects }) => {
      const { ruleCreation } = pageObjects;
      const RULE_NAME = 'ES|QL Rule Test';

      await test.step('Navigate to rule creation page', async () => {
        await ruleCreation.goto();
      });

      await test.step('Select ES|QL rule type', async () => {
        const esqlRuleType = page.testSubj.locator('esqlRuleType');
        await esqlRuleType.click();
      });

      await test.step('Fill ES|QL query and continue', async () => {
        const esqlQueryBar = page.testSubj.locator('esqlQueryBar');
        const editor = esqlQueryBar.locator('.kibanaCodeEditor');
        await editor.click();
        await page.keyboard.type('FROM auditbeat-* METADATA _id, _version, _index | LIMIT 10');
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

    test('Shows error when ES|QL query is empty', async ({ page, pageObjects }) => {
      const { ruleCreation } = pageObjects;

      await test.step('Navigate to rule creation page', async () => {
        await ruleCreation.goto();
      });

      await test.step('Select ES|QL rule type', async () => {
        const esqlRuleType = page.testSubj.locator('esqlRuleType');
        await esqlRuleType.click();
      });

      await test.step('Click continue without filling query', async () => {
        await ruleCreation.clickContinue();
      });

      await test.step('Verify validation error is shown', async () => {
        const esqlQueryBar = page.testSubj.locator('esqlQueryBar');
        await expect(esqlQueryBar).toContainText('required');
      });
    });

    test('Creates ES|QL rule via API and verifies on details page', async ({
      pageObjects,
      kbnClient,
    }) => {
      const rule = getNewEsqlRule({ rule_id: `esql-${Date.now()}` });
      const created = await createRuleFromParams(kbnClient, rule);
      await pageObjects.ruleDetails.goto(created.id);
      await expect(pageObjects.ruleDetails.ruleNameHeader).toContainText(rule.name);
    });
  }
);
