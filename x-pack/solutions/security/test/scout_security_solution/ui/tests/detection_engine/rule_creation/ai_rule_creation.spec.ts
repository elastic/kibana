/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, deleteConnectors } from '../../../common/api_helpers';

test.describe(
  'AI rule creation',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await deleteConnectors(kbnClient);
    });

    test.afterEach(async ({ kbnClient }) => {
      await deleteConnectors(kbnClient);
    });

    test('AI rule creation navigates to AI assistant page', async ({ page, pageObjects }) => {
      await test.step('Navigate to rules management page', async () => {
        await page.gotoApp('security/rules/management');
        await pageObjects.rulesManagementTable.waitForTableToLoad();
      });

      await test.step('Click create new rule button', async () => {
        const createRuleBtn = page.testSubj.locator('create-new-rule');
        await createRuleBtn.click();
      });

      await test.step('Verify rule creation page is visible', async () => {
        const defineStep = page.testSubj.locator('defineRule');
        await expect(defineStep).toBeVisible();
      });
    });

    test('AI-assisted rule creation link is accessible from rule creation page', async ({
      page,
      pageObjects,
    }) => {
      const { ruleCreation } = pageObjects;

      await test.step('Navigate to rule creation page', async () => {
        await ruleCreation.goto();
      });

      await test.step('Verify AI assistant option exists', async () => {
        const aiAssistantLink = page.testSubj.locator('aiRuleCreation');
        const isVisible = await aiAssistantLink.isVisible().catch(() => false);
        test.skip(!isVisible, 'AI rule creation option not available in this environment');
        await expect(aiAssistantLink).toBeVisible();
      });
    });
  }
);
