/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { ELASTIC_SECURITY_RULE_ID } from '@kbn/security-solution-plugin/common';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  getRuleWithWebHookAction,
  updateRule,
  installMockPrebuiltRules,
  fetchRule,
  createWebHookRuleAction,
  findImmutableRuleById,
  ruleToUpdateSchema,
  getCustomQueryRuleParams,
  getPrebuiltRulesAndTimelinesStatus,
} from '../../../utils';
import {
  deleteAllRules,
  deleteAllAlerts,
  waitForRuleSuccess,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  const getImmutableRule = async () => {
    await installMockPrebuiltRules(supertest, es);
    return fetchRule(supertest, { ruleId: ELASTIC_SECURITY_RULE_ID });
  };

  describe('@serverless @ess update_actions', () => {
    describe('updating actions', () => {
      beforeEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('updates rule with a webhook action', async () => {
        const webhookAction = await createWebHookRuleAction(supertest);

        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send(getCustomQueryRuleParams({ rule_id: 'rule-1' }))
          .expect(200);

        const ruleAction = {
          group: 'default',
          id: webhookAction.id,
          params: {
            body: '{}',
          },
          action_type_id: '.webhook',
        };
        const updatedRule = await updateRule(
          supertest,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            actions: [ruleAction],
          })
        );

        expect(updatedRule.actions).toEqual([expect.objectContaining(ruleAction)]);
      });

      it('removes webhook from a rule', async () => {
        const webhookAction = await createWebHookRuleAction(supertest);

        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send(
            getCustomQueryRuleParams({
              rule_id: 'rule-1',
              actions: [
                {
                  group: 'default',
                  id: webhookAction.id,
                  params: {
                    body: '{}',
                  },
                  action_type_id: '.webhook',
                },
              ],
            })
          )
          .expect(200);

        const updatedRule = await updateRule(
          supertest,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            actions: undefined,
          })
        );

        expect(updatedRule.actions).toEqual([]);
      });

      it('expects an updated rule with a webhook action runs successfully', async () => {
        const webhookAction = await createWebHookRuleAction(supertest);

        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send(getCustomQueryRuleParams({ rule_id: 'rule-1' }))
          .expect(200);

        const ruleAction = {
          group: 'default',
          id: webhookAction.id,
          params: {
            body: '{}',
          },
          action_type_id: '.webhook',
        };
        const updatedRule = await updateRule(
          supertest,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            actions: [ruleAction],
            enabled: true,
          })
        );

        await waitForRuleSuccess({ supertest, log, id: updatedRule.id });

        const { body } = await supertest
          .get(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .query({ id: updatedRule.id })
          .expect(200);

        expect(body?.execution_summary?.last_execution?.status).toBe('succeeded');
      });

      // Broken in MKI environment, needs triage
      it('@skipInServerlessMKI expects an updated rule with a webhook action and meta field runs successfully', async () => {
        const webhookAction = await createWebHookRuleAction(supertest);

        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send(getCustomQueryRuleParams({ rule_id: 'rule-1' }))
          .expect(200);

        const ruleAction = {
          group: 'default',
          id: webhookAction.id,
          params: {
            body: '{}',
          },
          action_type_id: '.webhook',
        };
        const updatedRule = await updateRule(
          supertest,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            actions: [ruleAction],
            meta: {},
            enabled: true,
          })
        );

        await waitForRuleSuccess({ supertest, log, id: updatedRule.id });

        const { body } = await supertest
          .get(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .query({ id: updatedRule.id })
          .expect(200);

        expect(body?.execution_summary?.last_execution?.status).toBe('succeeded');
      });

      // Broken in MKI environment, needs triage
      it('@skipInServerlessMKI adds a webhook to an immutable rule', async () => {
        const immutableRule = await getImmutableRule();
        const webhookAction = await createWebHookRuleAction(supertest);
        const ruleAction = {
          group: 'default',
          id: webhookAction.id,
          params: {
            body: '{}',
          },
          action_type_id: '.webhook',
        };
        const updatedRule = await updateRule(
          supertest,
          getCustomQueryRuleParams({
            rule_id: ELASTIC_SECURITY_RULE_ID,
            actions: [ruleAction],
          })
        );

        expect(updatedRule.actions).toEqual([expect.objectContaining(ruleAction)]);
        expect(updatedRule.throttle).toEqual(immutableRule.throttle);
      });

      // Broken in MKI environment, needs triage
      it('@skipInServerlessMKI should be able to create a new webhook action, attach it to an immutable rule and the count of prepackaged rules should not increase. If this fails, suspect the immutable tags are not staying on the rule correctly.', async () => {
        const immutableRule = await getImmutableRule();
        const hookAction = await createWebHookRuleAction(supertest);
        const ruleToUpdate = getRuleWithWebHookAction(
          hookAction.id,
          immutableRule.enabled,
          ruleToUpdateSchema(immutableRule)
        );
        await updateRule(supertest, ruleToUpdate);

        const status = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
        expect(status.rules_not_installed).toBe(0);
      });

      // Broken in MKI environment, needs triage
      it('@skipInServerlessMKI should be able to create a new webhook action, attach it to an immutable rule and the rule should stay immutable when searching against immutable tags', async () => {
        const immutableRule = await getImmutableRule();
        const webhookAction = await createWebHookRuleAction(supertest);
        const ruleAction = {
          group: 'default',
          id: webhookAction.id,
          params: {
            body: '{}',
          },
          action_type_id: '.webhook',
        };
        const ruleToUpdate = getRuleWithWebHookAction(
          webhookAction.id,
          immutableRule.enabled,
          ruleToUpdateSchema(immutableRule)
        );
        await updateRule(supertest, ruleToUpdate);
        const body = await findImmutableRuleById(supertest, log, ELASTIC_SECURITY_RULE_ID);

        expect(body.data.length).toBe(1); // should have only one length to the data set, otherwise we have duplicates or the tags were removed and that is incredibly bad.
        expect(body.data[0].actions).toEqual([expect.objectContaining(ruleAction)]);
        expect(body.data[0].immutable).toBeTruthy();
      });
    });
  });
};
