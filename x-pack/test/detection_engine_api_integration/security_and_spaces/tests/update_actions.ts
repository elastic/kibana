/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { CreateRulesSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  removeServerGeneratedProperties,
  getRuleWithWebHookAction,
  getSimpleRuleOutputWithWebHookAction,
  waitForRuleSuccessOrStatus,
  createRule,
  getSimpleRule,
  updateRule,
  installPrePackagedRules,
  getRule,
  createNewAction,
  findImmutableRuleById,
  getPrePackagedRulesStatus,
  getSimpleRuleOutput,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  describe('update_actions', () => {
    describe('updating actions', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should be able to create a new webhook action and update a rule with the webhook action', async () => {
        const hookAction = await createNewAction(supertest, log);
        const rule = getSimpleRule();
        await createRule(supertest, log, rule);
        const ruleToUpdate = getRuleWithWebHookAction(hookAction.id, false, rule);
        const updatedRule = await updateRule(supertest, log, ruleToUpdate);
        const bodyToCompare = removeServerGeneratedProperties(updatedRule);

        const expected = {
          ...getSimpleRuleOutputWithWebHookAction(`${bodyToCompare.actions?.[0].id}`),
          version: 2, // version bump is required since this is an updated rule and this is part of the testing that we do bump the version number on update
        };
        expect(bodyToCompare).to.eql(expected);
      });

      it('should be able to add a new webhook action and then remove the action from the rule again', async () => {
        const hookAction = await createNewAction(supertest, log);
        const rule = getSimpleRule();
        await createRule(supertest, log, rule);
        const ruleToUpdate = getRuleWithWebHookAction(hookAction.id, false, rule);
        await updateRule(supertest, log, ruleToUpdate);
        const ruleAfterActionRemoved = await updateRule(supertest, log, rule);
        const bodyToCompare = removeServerGeneratedProperties(ruleAfterActionRemoved);
        const expected = {
          ...getSimpleRuleOutput(),
          version: 3, // version bump is required since this is an updated rule and this is part of the testing that we do bump the version number on update
        };
        expect(bodyToCompare).to.eql(expected);
      });

      it('should be able to create a new webhook action and attach it to a rule without a meta field and run it correctly', async () => {
        const hookAction = await createNewAction(supertest, log);
        const rule = getSimpleRule();
        await createRule(supertest, log, rule);
        const ruleToUpdate = getRuleWithWebHookAction(hookAction.id, true, rule);
        const updatedRule = await updateRule(supertest, log, ruleToUpdate);
        await waitForRuleSuccessOrStatus(supertest, log, updatedRule.id);
      });

      it('should be able to create a new webhook action and attach it to a rule with a meta field and run it correctly', async () => {
        const hookAction = await createNewAction(supertest, log);
        const rule = getSimpleRule();
        await createRule(supertest, log, rule);
        const ruleToUpdate: CreateRulesSchema = {
          ...getRuleWithWebHookAction(hookAction.id, true, rule),
          meta: {}, // create a rule with the action attached and a meta field
        };
        const updatedRule = await updateRule(supertest, log, ruleToUpdate);
        await waitForRuleSuccessOrStatus(supertest, log, updatedRule.id);
      });

      it('should be able to create a new webhook action and attach it to an immutable rule', async () => {
        await installPrePackagedRules(supertest, log);
        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint.json
        const immutableRule = await getRule(supertest, log, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
        const hookAction = await createNewAction(supertest, log);
        const newRuleToUpdate = getSimpleRule(immutableRule.rule_id);
        const ruleToUpdate = getRuleWithWebHookAction(hookAction.id, false, newRuleToUpdate);
        const updatedRule = await updateRule(supertest, log, ruleToUpdate);
        const bodyToCompare = removeServerGeneratedProperties(updatedRule);

        const expected = {
          ...getSimpleRuleOutputWithWebHookAction(`${bodyToCompare.actions?.[0].id}`),
          rule_id: immutableRule.rule_id, // Rule id should match the same as the immutable rule
          version: immutableRule.version, // This version number should not change when an immutable rule is updated
          immutable: true, // It should stay immutable true when returning
        };
        expect(bodyToCompare).to.eql(expected);
      });

      it('should be able to create a new webhook action, attach it to an immutable rule and the count of prepackaged rules should not increase. If this fails, suspect the immutable tags are not staying on the rule correctly.', async () => {
        await installPrePackagedRules(supertest, log);
        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint.json
        const immutableRule = await getRule(supertest, log, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
        const hookAction = await createNewAction(supertest, log);
        const newRuleToUpdate = getSimpleRule(immutableRule.rule_id);
        const ruleToUpdate = getRuleWithWebHookAction(hookAction.id, false, newRuleToUpdate);
        await updateRule(supertest, log, ruleToUpdate);

        const status = await getPrePackagedRulesStatus(supertest, log);
        expect(status.rules_not_installed).to.eql(0);
      });

      it('should be able to create a new webhook action, attach it to an immutable rule and the rule should stay immutable when searching against immutable tags', async () => {
        await installPrePackagedRules(supertest, log);
        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint.json
        const immutableRule = await getRule(supertest, log, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
        const hookAction = await createNewAction(supertest, log);
        const newRuleToUpdate = getSimpleRule(immutableRule.rule_id);
        const ruleToUpdate = getRuleWithWebHookAction(hookAction.id, false, newRuleToUpdate);
        await updateRule(supertest, log, ruleToUpdate);
        const body = await findImmutableRuleById(
          supertest,
          log,
          '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
        );

        expect(body.data.length).to.eql(1); // should have only one length to the data set, otherwise we have duplicates or the tags were removed and that is incredibly bad.
        const bodyToCompare = removeServerGeneratedProperties(body.data[0]);
        const expected = {
          ...getSimpleRuleOutputWithWebHookAction(`${bodyToCompare.actions?.[0].id}`),
          rule_id: immutableRule.rule_id, // Rule id should match the same as the immutable rule
          version: immutableRule.version, // This version number should not change when an immutable rule is updated
          immutable: true, // It should stay immutable true when returning
        };
        expect(bodyToCompare).to.eql(expected);
      });
    });
  });
};
