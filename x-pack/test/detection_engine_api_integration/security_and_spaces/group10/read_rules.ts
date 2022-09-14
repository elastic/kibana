/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  getWebHookAction,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('read_rules', () => {
    describe('reading rules', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should be able to read a single rule using rule_id', async () => {
        await createRule(supertest, log, getSimpleRule());

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(getSimpleRuleOutput());
      });

      it('should be able to read a single rule using id', async () => {
        const createRuleBody = await createRule(supertest, log, getSimpleRule());

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?id=${createRuleBody.id}`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(getSimpleRuleOutput());
      });

      it('should be able to read a single rule with an auto-generated rule_id', async () => {
        const createRuleBody = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=${createRuleBody.rule_id}`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
      });

      it('should return 404 if given a fake id', async () => {
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?id=c1e1b359-7ac1-4e96-bc81-c683c092436f`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'id: "c1e1b359-7ac1-4e96-bc81-c683c092436f" not found',
        });
      });

      it('should return 404 if given a fake rule_id', async () => {
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=fake_id`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'rule_id: "fake_id" not found',
        });
      });

      it('should be able to a read a execute immediately action correctly', async () => {
        // create connector/action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        const action = {
          group: 'default',
          id: hookAction.id,
          action_type_id: hookAction.actionTypeId,
          params: {},
        };

        // create rule with connector/action
        const rule: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [action],
        };
        const createRuleBody = await createRule(supertest, log, rule);

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?id=${createRuleBody.id}`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        const ruleWithActions: ReturnType<typeof getSimpleRuleOutput> = {
          ...getSimpleRuleOutput(),
          actions: [action],
          throttle: 'rule',
        };
        expect(bodyToCompare).to.eql(ruleWithActions);
      });

      it('should be able to a read a scheduled action correctly', async () => {
        // create connector/action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        const action = {
          group: 'default',
          id: hookAction.id,
          action_type_id: hookAction.actionTypeId,
          params: {},
        };

        // create rule with connector/action
        const rule: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          throttle: '1h', // <-- throttle makes this a scheduled action
          actions: [action],
        };

        const createRuleBody = await createRule(supertest, log, rule);

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?id=${createRuleBody.id}`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        const ruleWithActions: ReturnType<typeof getSimpleRuleOutput> = {
          ...getSimpleRuleOutput(),
          actions: [action],
          throttle: '1h', // <-- throttle makes this a scheduled action
        };
        expect(bodyToCompare).to.eql(ruleWithActions);
      });

      /**
       * Tests the legacy actions to ensure we can export legacy notifications
       * @deprecated Once the legacy notification system is removed, remove this test too.
       */
      describe('legacy_notification_system', () => {
        it('should be able to a read a scheduled action correctly', async () => {
          // create an action
          const { body: hookAction } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          // create a rule without actions
          const createRuleBody = await createRule(supertest, log, getSimpleRule('rule-1'));

          // attach the legacy notification
          await supertest
            .post(`/internal/api/detection/legacy/notifications?alert_id=${createRuleBody.id}`)
            .set('kbn-xsrf', 'true')
            .send({
              name: 'Legacy notification with one action',
              interval: '1h',
              actions: [
                {
                  id: hookAction.id,
                  group: 'default',
                  params: {
                    message:
                      'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  actionTypeId: hookAction.actionTypeId,
                },
              ],
            })
            .expect(200);

          // read the rule which should have the legacy actions attached
          const { body } = await supertest
            .get(`${DETECTION_ENGINE_RULES_URL}?id=${createRuleBody.id}`)
            .set('kbn-xsrf', 'true')
            .send(getSimpleRule())
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(body);
          const ruleWithActions: ReturnType<typeof getSimpleRuleOutput> = {
            ...getSimpleRuleOutput(),
            actions: [
              {
                id: hookAction.id,
                group: 'default',
                params: {
                  message:
                    'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
                action_type_id: hookAction.actionTypeId,
              },
            ],
            throttle: '1h',
          };
          expect(bodyToCompare).to.eql(ruleWithActions);
        });
      });
    });
  });
};
