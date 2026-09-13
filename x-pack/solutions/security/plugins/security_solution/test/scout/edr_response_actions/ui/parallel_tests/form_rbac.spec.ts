/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../fixtures';

const CREATE_RULE_NAME = 'scout-response-actions-create-rbac';

const SEEDED_RESPONSE_ACTIONS = [
  {
    params: { command: 'isolate', comment: 'Isolate host' },
    action_type_id: '.endpoint',
  },
  {
    params: {
      command: 'suspend-process',
      comment: 'Suspend host',
      config: { field: 'entity_id', overwrite: false },
    },
    action_type_id: '.endpoint',
  },
  {
    params: {
      command: 'kill-process',
      comment: 'Kill host',
      config: { field: '', overwrite: true },
    },
    action_type_id: '.endpoint',
  },
];

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
        const { ruleCreateWizard, ruleResponseActionsForm } = pageObjects;
        spaceTest.setTimeout(120_000);

        await spaceTest.step('open the rule create wizard on the Actions step', async () => {
          await ruleCreateWizard.completeUntilActionsStep({
            name: CREATE_RULE_NAME,
            query: '_id:*',
          });
          await ruleResponseActionsForm.responseActionsWrapper.waitFor({ state: 'visible' });
        });

        await spaceTest.step('Elastic Defend keypad is disabled', async () => {
          await ruleResponseActionsForm.ensureEndpointActionKeypad();
          await expect(ruleResponseActionsForm.endpointActionOption).toBeDisabled();
        });
      }
    );

    spaceTest(
      'rule_author cannot edit or remove existing Elastic Defend response actions',
      async ({ pageObjects, apiServices, scoutSpace }) => {
        const { ruleResponseActionsForm } = pageObjects;
        const ruleName = `scout-response-actions-edit-rbac-${scoutSpace.id}`;

        const rule = await apiServices.detectionRule.createCustomQueryRule({
          ...CUSTOM_QUERY_RULE,
          name: ruleName,
          description: ruleName,
          rule_id: ruleName,
          enabled: false,
          language: 'kuery',
          response_actions: SEEDED_RESPONSE_ACTIONS,
        });

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
