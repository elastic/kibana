/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { CreateRulesSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/request';
import { DETECTION_ENGINE_RULES_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  removeServerGeneratedProperties,
  getWebHookAction,
  getRuleWithWebHookAction,
  getSimpleRuleOutputWithWebHookAction,
  waitForRuleSuccess,
  createRule,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  describe('add_actions', () => {
    describe('adding actions', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
      });

      it('should be able to create a new webhook action and attach it to a rule', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        const rule = await createRule(supertest, getRuleWithWebHookAction(hookAction.id));
        const bodyToCompare = removeServerGeneratedProperties(rule);
        expect(bodyToCompare).to.eql(
          getSimpleRuleOutputWithWebHookAction(`${bodyToCompare?.actions?.[0].id}`)
        );
      });

      it('should be able to create a new webhook action and attach it to a rule without a meta field and run it correctly', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        const rule = await createRule(supertest, getRuleWithWebHookAction(hookAction.id, true));
        await waitForRuleSuccess(supertest, rule.id);

        // expected result for status should be 'succeeded'
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_find_statuses`)
          .set('kbn-xsrf', 'true')
          .send({ ids: [rule.id] })
          .expect(200);
        expect(body[rule.id].current_status.status).to.eql('succeeded');
      });

      it('should be able to create a new webhook action and attach it to a rule with a meta field and run it correctly', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        // create a rule with the action attached and a meta field
        const ruleWithAction: CreateRulesSchema = {
          ...getRuleWithWebHookAction(hookAction.id, true),
          meta: {},
        };

        const rule = await createRule(supertest, ruleWithAction);
        await waitForRuleSuccess(supertest, rule.id);

        // expected result for status should be 'succeeded'
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_find_statuses`)
          .set('kbn-xsrf', 'true')
          .send({ ids: [rule.id] })
          .expect(200);
        expect(body[rule.id].current_status.status).to.eql('succeeded');
      });
    });
  });
};
