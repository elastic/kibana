/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../../fixtures';
import { RULE_NAMES } from '../../../fixtures/generators';
import { SHORTER_TIMEOUT } from '../../../fixtures/constants';

test.describe(
  'Rules Page - Rules Tab',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.rulesPage.goto();
    });

    test('should see the Rules Table container', async ({ pageObjects }) => {
      await expect(pageObjects.rulesPage.rulesTableContainer).toBeVisible();
    });

    test('should see a non-editable rule in the Rules Table', async ({ pageObjects }) => {
      const nonEditableRules = pageObjects.rulesPage.getNonEditableRules();
      await expect(nonEditableRules.filter({ hasText: RULE_NAMES.FIRST_RULE_TEST })).toHaveCount(1);
    });

    test('should not show the edit action button for a rule when logged in as viewer', async ({
      pageObjects,
    }) => {
      // As a viewer, rules appear as non-editable
      const nonEditableRules = pageObjects.rulesPage.getNonEditableRules();
      const ruleRow = nonEditableRules.filter({ hasText: RULE_NAMES.FIRST_RULE_TEST });

      // Verify the rule row is visible (rule exists in table)
      await expect(ruleRow).toBeVisible();
      await ruleRow.hover();

      // Verify the edit action (ruleSidebarEditAction) is NOT visible for viewers
      const editActionContainer = pageObjects.rulesPage.getRuleSidebarEditAction(ruleRow);
      await expect(editActionContainer).toBeHidden({ timeout: SHORTER_TIMEOUT });

      // Verify the edit button is also NOT visible
      const editButton = pageObjects.rulesPage.getEditActionButton(ruleRow);
      await expect(editButton).toBeHidden();
    });
  }
);
