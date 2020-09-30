/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  removeServerGeneratedProperties,
  waitFor,
  getWebHookAction,
  getRuleWithWebHookAction,
  getSimpleRuleOutputWithWebHookAction,
} from '../../utils';
import { CreateRulesSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/request/create_rules_schema';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('add_actions', () => {
    describe('adding actions', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(es);
      });

      it('should be able to create a new webhook action and attach it to a rule', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        // create a rule with the action attached
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getRuleWithWebHookAction(hookAction.id))
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
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

        // create a rule with the action attached
        const { body: rule } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getRuleWithWebHookAction(hookAction.id))
          .expect(200);

        // wait for Task Manager to execute the rule and its update status
        await waitFor(async () => {
          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_find_statuses`)
            .set('kbn-xsrf', 'true')
            .send({ ids: [rule.id] })
            .expect(200);
          return body[rule.id].current_status?.status === 'succeeded';
        });

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
          ...getRuleWithWebHookAction(hookAction.id),
          meta: {},
        };

        const { body: rule } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(ruleWithAction)
          .expect(200);

        // wait for Task Manager to execute the rule and update status
        await waitFor(async () => {
          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_find_statuses`)
            .set('kbn-xsrf', 'true')
            .send({ ids: [rule.id] })
            .expect(200);
          return body[rule.id].current_status?.status === 'succeeded';
        });

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
