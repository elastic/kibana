/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../fixtures';
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
      async ({ pageObjects }) => {
        const { ruleResponseActionsForm } = pageObjects;
        spaceTest.setTimeout(120_000);

        await spaceTest.step('open the rule create wizard on the Actions step', async () => {
          await ruleResponseActionsForm.completeWizardUntilActionsStep();
        });

        await spaceTest.step('Elastic Defend keypad is disabled', async () => {
          await ruleResponseActionsForm.ensureEndpointActionKeypad();
          await expect(ruleResponseActionsForm.endpointActionOption).toBeDisabled();
        });
      }
    );

    spaceTest(
      'rule_author cannot edit or remove existing Elastic Defend response actions',
      async ({ pageObjects, kbnClient, scoutSpace }) => {
        const { ruleResponseActionsForm } = pageObjects;
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

        await spaceTest.step('Elastic Defend keypad is disabled on edit', async () => {
          await ruleResponseActionsForm.ensureEndpointActionKeypad();
          await expect(ruleResponseActionsForm.endpointActionOption).toBeDisabled();
        });
      }
    );
  }
);
