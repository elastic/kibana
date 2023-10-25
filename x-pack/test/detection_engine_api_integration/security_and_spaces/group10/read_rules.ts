/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  DETECTION_ENGINE_RULES_URL,
  UPDATE_OR_CREATE_LEGACY_ACTIONS,
} from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllRules,
  deleteAllAlerts,
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  getWebHookAction,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  RULE_WITH_LEGACY_INVESTIGATION_FIELD,
  RULE_WITH_LEGACY_INVESTIGATION_FIELD_EMPTY_ARRAY,
  RULE_WITH_INVESTIGATION_FIELD,
  getRuleSOById,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('read_rules', () => {
    describe('reading rules', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should be able to read a single rule using rule_id', async () => {
        await createRule(supertest, log, getSimpleRule());

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
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
          .set('elastic-api-version', '2023-10-31')
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
          .set('elastic-api-version', '2023-10-31')
          .send(getSimpleRule())
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
      });

      it('should return 404 if given a fake id', async () => {
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?id=c1e1b359-7ac1-4e96-bc81-c683c092436f`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
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
          .set('elastic-api-version', '2023-10-31')
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
          .set('elastic-api-version', '2023-10-31')
          .send(getSimpleRule())
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        const ruleWithActions: ReturnType<typeof getSimpleRuleOutput> = {
          ...getSimpleRuleOutput(),
          actions: [
            {
              ...action,
              uuid: bodyToCompare.actions[0].uuid,
              frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
            },
          ],
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
          .set('elastic-api-version', '2023-10-31')
          .send(getSimpleRule())
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        const ruleWithActions: ReturnType<typeof getSimpleRuleOutput> = {
          ...getSimpleRuleOutput(),
          actions: [
            {
              ...action,
              uuid: bodyToCompare.actions[0].uuid,
              frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
            },
          ],
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
            .post(`${UPDATE_OR_CREATE_LEGACY_ACTIONS}?alert_id=${createRuleBody.id}`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '1')
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
            .set('elastic-api-version', '2023-10-31')
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
                frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
              },
            ],
          };
          expect(bodyToCompare).to.eql(ruleWithActions);
        });
      });
    });

    describe('investigation_fields', () => {
      before(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await createSignalsIndex(supertest, log);
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/legacy_investigation_fields'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/legacy_investigation_fields'
        );
      });

      it('should be able to read a rule with a legacy investigation field', async () => {
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=${RULE_WITH_LEGACY_INVESTIGATION_FIELD}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare.investigation_fields).to.eql({
          field_names: ['client.address', 'agent.name'],
        });
        /*
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should
         * just be a transform on read, not a migration on SO.
         */
        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, body.id);
        expect(ruleSO?.alert?.params?.investigationFields).to.eql(['client.address', 'agent.name']);
      });

      it('should be able to read a rule with a legacy investigation field - empty array', async () => {
        const { body } = await supertest
          .get(
            `${DETECTION_ENGINE_RULES_URL}?rule_id=${RULE_WITH_LEGACY_INVESTIGATION_FIELD_EMPTY_ARRAY}`
          )
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare.investigation_fields).to.eql(undefined);
        /*
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should
         * just be a transform on read, not a migration on SO.
         */
        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, body.id);
        expect(ruleSO?.alert?.params?.investigationFields).to.eql([]);
      });

      it('does not migrate investigation fields when intended object type', async () => {
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=${RULE_WITH_INVESTIGATION_FIELD}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare.investigation_fields).to.eql({ field_names: ['host.name'] });
        /*
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should
         * just be a transform on read, not a migration on SO.
         */
        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, body.id);
        expect(ruleSO?.alert?.params?.investigationFields).to.eql({ field_names: ['host.name'] });
      });
    });
  });
};
