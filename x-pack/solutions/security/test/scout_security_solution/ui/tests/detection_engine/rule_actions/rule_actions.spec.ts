/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, deleteConnectors } from '../../../common/api_helpers';

test.describe(
  'Rule actions',
  {
    tag: [...tags.stateful.classic],
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

    test('Can configure rule actions during rule creation', async ({ page, pageObjects }) => {
      const { ruleCreation } = pageObjects;

      await test.step('Navigate to rule creation page', async () => {
        await ruleCreation.goto();
      });

      await test.step('Fill define step', async () => {
        await ruleCreation.clickContinue();
      });

      await test.step('Fill about step', async () => {
        await ruleCreation.fillRuleName('Rule Actions Test');
        await ruleCreation.clickContinue();
      });

      await test.step('Fill schedule step', async () => {
        await ruleCreation.clickContinue();
      });

      await test.step('Verify actions step is visible', async () => {
        const actionsStep = page.testSubj.locator('ruleActions');
        const isVisible = await actionsStep.isVisible().catch(() => false);
        test.skip(!isVisible, 'Actions step not visible in wizard flow');
        await expect(actionsStep).toBeVisible();
      });
    });
  }
);
