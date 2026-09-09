/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, expect, tags } from '../fixtures';
import { createRuleWithAutomatedResponseActions } from '../fixtures/seed_rule';

spaceTest.describe(
  'Automated response actions form RBAC',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsSecurityRole('rule_author');
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
    });

    spaceTest(
      'rule_author cannot add an Elastic Defend response action while creating a rule',
      async ({ pageObjects, scoutSpace }) => {
        const { ruleResponseActionsForm } = pageObjects;
        spaceTest.setTimeout(120_000);

        await spaceTest.step('open the rule create wizard on the Actions step', async () => {
          const ruleName = `scout-response-actions-create-rbac-${scoutSpace.id}`;
          await ruleResponseActionsForm.gotoCreateActionsStep(ruleName, ruleName);
        });

        await spaceTest.step(
          'Elastic Defend keypad is disabled and a click does not add a row',
          async () => {
            await ruleResponseActionsForm.revealEndpointActionKeypad();
            await expect(ruleResponseActionsForm.endpointActionOption).toBeDisabled();
            await ruleResponseActionsForm.dispatchClickOnDisabledEndpointOption();
            await expect(ruleResponseActionsForm.responseActionItem(0)).toHaveCount(0);
          }
        );
      }
    );

    spaceTest(
      'rule_author cannot edit or remove existing Elastic Defend response actions',
      async ({ pageObjects, kbnClient, scoutSpace }) => {
        const { ruleResponseActionsForm } = pageObjects;
        spaceTest.setTimeout(120_000);
        const ruleName = `scout-response-actions-edit-rbac-${scoutSpace.id}`;

        const rule = await createRuleWithAutomatedResponseActions(
          kbnClient,
          scoutSpace.id,
          ruleName
        );

        await spaceTest.step('open the rule edit Actions tab', async () => {
          await ruleResponseActionsForm.gotoEditActions(rule.id);
        });

        await spaceTest.step('existing isolate row controls are disabled', async () => {
          await expect(ruleResponseActionsForm.commandTypeField(0)).toContainText('isolate');
          await expect(ruleResponseActionsForm.commandTypeField(0)).toBeDisabled();
          await expect(ruleResponseActionsForm.commentInput(0)).toHaveValue('Isolate host');
          await expect(ruleResponseActionsForm.commentInput(0)).toBeDisabled();
          await expect(ruleResponseActionsForm.removeResponseAction(0)).toBeDisabled();
        });

        await spaceTest.step(
          'force-removing a row and force-adding a command do not change the list',
          async () => {
            await ruleResponseActionsForm.dispatchClickOnDisabledRemove(0);
            await expect(ruleResponseActionsForm.responseActionItem(2)).toBeVisible();

            await ruleResponseActionsForm.revealEndpointActionKeypad();
            await expect(ruleResponseActionsForm.endpointActionOption).toBeDisabled();
            await ruleResponseActionsForm.dispatchClickOnDisabledEndpointOption();
            await expect(ruleResponseActionsForm.responseActionItem(3)).toHaveCount(0);
          }
        );
      }
    );
  }
);
