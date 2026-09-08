/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { tags, test } from '../fixtures';
import { createRuleWithResponseActions, deleteRule } from '../fixtures/rule_with_response_actions';

test.describe(
  'Rule author cannot change existing response actions',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleId: string | undefined;

    test.beforeEach(async ({ browserAuth, kbnClient }) => {
      const rule = await createRuleWithResponseActions(kbnClient);
      ruleId = rule.id;
      await browserAuth.loginAsSecurityRole('rule_author');
    });

    test.afterEach(async ({ kbnClient }) => {
      const idToDelete = ruleId;
      ruleId = undefined;
      if (idToDelete) {
        await deleteRule(kbnClient, idToDelete);
      }
    });

    test('existing rows stay disabled and force-remove does not drop a row', async ({
      pageObjects,
    }) => {
      const id = ruleId;
      if (!id) {
        throw new Error('Expected beforeEach to create a rule');
      }

      await pageObjects.ruleResponseActionsForm.openEditActions(id);

      await expect(pageObjects.ruleResponseActionsForm.commandField(0)).toBeDisabled();
      await expect(pageObjects.ruleResponseActionsForm.commandField(0)).toContainText('isolate');
      await expect(pageObjects.ruleResponseActionsForm.commentInput(0)).toBeDisabled();
      await expect(pageObjects.ruleResponseActionsForm.commentInput(0)).toHaveValue('Isolate host');
      await expect(pageObjects.ruleResponseActionsForm.removeButton(0)).toBeDisabled();

      await expect(pageObjects.ruleResponseActionsForm.commandField(1)).toBeDisabled();
      await expect(pageObjects.ruleResponseActionsForm.commandField(1)).toContainText(
        'suspend-process'
      );
      await expect(pageObjects.ruleResponseActionsForm.commentInput(1)).toBeDisabled();
      await expect(pageObjects.ruleResponseActionsForm.commentInput(1)).toHaveValue('Suspend host');
      await expect(pageObjects.ruleResponseActionsForm.removeButton(1)).toBeDisabled();

      await expect(pageObjects.ruleResponseActionsForm.commandField(2)).toBeDisabled();
      await expect(pageObjects.ruleResponseActionsForm.commandField(2)).toContainText(
        'kill-process'
      );
      await expect(pageObjects.ruleResponseActionsForm.commentInput(2)).toBeDisabled();
      await expect(pageObjects.ruleResponseActionsForm.commentInput(2)).toHaveValue('Kill host');
      await expect(pageObjects.ruleResponseActionsForm.removeButton(2)).toBeDisabled();

      await pageObjects.ruleResponseActionsForm.forceRemove(0);
      await expect(pageObjects.ruleResponseActionsForm.responseActionItem(2)).toBeVisible();

      await expect(pageObjects.ruleResponseActionsForm.elasticDefendOption).toBeDisabled();
      await pageObjects.ruleResponseActionsForm.forceClickElasticDefendOption();
      await expect(pageObjects.ruleResponseActionsForm.responseActionItem(3)).toHaveCount(0);
    });
  }
);
