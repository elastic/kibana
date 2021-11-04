/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  binaryToString,
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleOutput,
  getWebHookAction,
  removeServerGeneratedProperties,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('export_rules', () => {
    describe('exporting rules', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should set the response content types to be expected', async () => {
        await createRule(supertest, log, getSimpleRule());

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200)
          .expect('Content-Type', 'application/ndjson')
          .expect('Content-Disposition', 'attachment; filename="export.ndjson"');
      });

      it('should export a single rule with a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule());

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200)
          .parse(binaryToString);

        const bodySplitAndParsed = JSON.parse(body.toString().split(/\n/)[0]);
        const bodyToTest = removeServerGeneratedProperties(bodySplitAndParsed);

        expect(bodyToTest).to.eql(getSimpleRuleOutput());
      });

      it('should export a exported count with a single rule_id', async () => {
        await createRule(supertest, log, getSimpleRule());

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200)
          .parse(binaryToString);

        const bodySplitAndParsed = JSON.parse(body.toString().split(/\n/)[1]);

        expect(bodySplitAndParsed).to.eql({
          exported_exception_list_count: 0,
          exported_exception_list_item_count: 0,
          exported_count: 1,
          exported_rules_count: 1,
          missing_exception_list_item_count: 0,
          missing_exception_list_items: [],
          missing_exception_lists: [],
          missing_exception_lists_count: 0,
          missing_rules: [],
          missing_rules_count: 0,
        });
      });

      it('should export exactly two rules given two rules', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));
        await createRule(supertest, log, getSimpleRule('rule-2'));

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200)
          .parse(binaryToString);

        const firstRuleParsed = JSON.parse(body.toString().split(/\n/)[0]);
        const secondRuleParsed = JSON.parse(body.toString().split(/\n/)[1]);
        const firstRule = removeServerGeneratedProperties(firstRuleParsed);
        const secondRule = removeServerGeneratedProperties(secondRuleParsed);

        expect([firstRule, secondRule]).to.eql([
          getSimpleRuleOutput('rule-2'),
          getSimpleRuleOutput('rule-1'),
        ]);
      });

      it('should export multiple actions attached to 1 rule', async () => {
        // 1st action
        const { body: hookAction1 } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        // 2nd action
        const { body: hookAction2 } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        const action1 = {
          group: 'default',
          id: hookAction1.id,
          action_type_id: hookAction1.actionTypeId,
          params: {},
        };
        const action2 = {
          group: 'default',
          id: hookAction2.id,
          action_type_id: hookAction2.actionTypeId,
          params: {},
        };

        const rule1: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [action1, action2],
        };

        await createRule(supertest, log, rule1);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200)
          .parse(binaryToString);

        const firstRuleParsed = JSON.parse(body.toString().split(/\n/)[0]);
        const firstRule = removeServerGeneratedProperties(firstRuleParsed);

        const outputRule1: ReturnType<typeof getSimpleRuleOutput> = {
          ...getSimpleRuleOutput('rule-1'),
          actions: [action1, action2],
          throttle: 'rule',
        };
        expect(firstRule).to.eql(outputRule1);
      });

      it('should export actions attached to 2 rules', async () => {
        // create a new action
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

        const rule1: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [action],
        };

        const rule2: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-2'),
          actions: [action],
        };

        await createRule(supertest, log, rule1);
        await createRule(supertest, log, rule2);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200)
          .parse(binaryToString);

        const firstRuleParsed = JSON.parse(body.toString().split(/\n/)[0]);
        const secondRuleParsed = JSON.parse(body.toString().split(/\n/)[1]);
        const firstRule = removeServerGeneratedProperties(firstRuleParsed);
        const secondRule = removeServerGeneratedProperties(secondRuleParsed);

        const outputRule1: ReturnType<typeof getSimpleRuleOutput> = {
          ...getSimpleRuleOutput('rule-2'),
          actions: [action],
          throttle: 'rule',
        };
        const outputRule2: ReturnType<typeof getSimpleRuleOutput> = {
          ...getSimpleRuleOutput('rule-1'),
          actions: [action],
          throttle: 'rule',
        };
        expect(firstRule).to.eql(outputRule1);
        expect(secondRule).to.eql(outputRule2);
      });

      /**
       * Tests the legacy actions to ensure we can export legacy notifications
       * @deprecated Once the legacy notification system is removed, remove this test too.
       */
      describe('legacy_notification_system', () => {
        it('should be able to export 1 legacy action on 1 rule', async () => {
          // create an action
          const { body: hookAction } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          // create a rule without actions
          const rule = await createRule(supertest, log, getSimpleRule('rule-1'));

          // attach the legacy notification
          await supertest
            .post(`/internal/api/detection/legacy/notifications?alert_id=${rule.id}`)
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

          // export the rule
          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
            .set('kbn-xsrf', 'true')
            .send()
            .expect(200)
            .parse(binaryToString);

          const outputRule1: ReturnType<typeof getSimpleRuleOutput> = {
            ...getSimpleRuleOutput('rule-1'),
            actions: [
              {
                group: 'default',
                id: hookAction.id,
                action_type_id: hookAction.actionTypeId,
                params: {
                  message:
                    'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
              },
            ],
            throttle: '1h',
          };
          const firstRuleParsed = JSON.parse(body.toString().split(/\n/)[0]);
          const firstRule = removeServerGeneratedProperties(firstRuleParsed);

          expect(firstRule).to.eql(outputRule1);
        });

        it('should be able to export 2 legacy actions on 1 rule', async () => {
          // create 1st action/connector
          const { body: hookAction1 } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          // create 2nd action/connector
          const { body: hookAction2 } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          // create a rule without actions
          const rule = await createRule(supertest, log, getSimpleRule('rule-1'));

          // attach the legacy notification with actions
          await supertest
            .post(`/internal/api/detection/legacy/notifications?alert_id=${rule.id}`)
            .set('kbn-xsrf', 'true')
            .send({
              name: 'Legacy notification with one action',
              interval: '1h',
              actions: [
                {
                  id: hookAction1.id,
                  group: 'default',
                  params: {
                    message:
                      'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  actionTypeId: hookAction1.actionTypeId,
                },
                {
                  id: hookAction2.id,
                  group: 'default',
                  params: {
                    message:
                      'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  actionTypeId: hookAction2.actionTypeId,
                },
              ],
            })
            .expect(200);

          // export the rule
          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
            .set('kbn-xsrf', 'true')
            .send()
            .expect(200)
            .parse(binaryToString);

          const outputRule1: ReturnType<typeof getSimpleRuleOutput> = {
            ...getSimpleRuleOutput('rule-1'),
            actions: [
              {
                group: 'default',
                id: hookAction1.id,
                action_type_id: hookAction1.actionTypeId,
                params: {
                  message:
                    'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
              },
              {
                group: 'default',
                id: hookAction2.id,
                action_type_id: hookAction2.actionTypeId,
                params: {
                  message:
                    'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
              },
            ],
            throttle: '1h',
          };
          const firstRuleParsed = JSON.parse(body.toString().split(/\n/)[0]);
          const firstRule = removeServerGeneratedProperties(firstRuleParsed);

          expect(firstRule).to.eql(outputRule1);
        });

        it('should be able to export 2 legacy actions on 2 rules', async () => {
          // create 1st action/connector
          const { body: hookAction1 } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          // create 2nd action/connector
          const { body: hookAction2 } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          // create 2 rules without actions
          const rule1 = await createRule(supertest, log, getSimpleRule('rule-1'));
          const rule2 = await createRule(supertest, log, getSimpleRule('rule-2'));

          // attach the legacy notification with actions to the first rule
          await supertest
            .post(`/internal/api/detection/legacy/notifications?alert_id=${rule1.id}`)
            .set('kbn-xsrf', 'true')
            .send({
              name: 'Legacy notification with one action',
              interval: '1h',
              actions: [
                {
                  id: hookAction1.id,
                  group: 'default',
                  params: {
                    message:
                      'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  actionTypeId: hookAction1.actionTypeId,
                },
                {
                  id: hookAction2.id,
                  group: 'default',
                  params: {
                    message:
                      'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  actionTypeId: hookAction2.actionTypeId,
                },
              ],
            })
            .expect(200);

          // attach the legacy notification with actions to the 2nd rule
          await supertest
            .post(`/internal/api/detection/legacy/notifications?alert_id=${rule2.id}`)
            .set('kbn-xsrf', 'true')
            .send({
              name: 'Legacy notification with one action',
              interval: '1h',
              actions: [
                {
                  id: hookAction1.id,
                  group: 'default',
                  params: {
                    message:
                      'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  actionTypeId: hookAction1.actionTypeId,
                },
                {
                  id: hookAction2.id,
                  group: 'default',
                  params: {
                    message:
                      'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  actionTypeId: hookAction2.actionTypeId,
                },
              ],
            })
            .expect(200);

          // export the rule
          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
            .set('kbn-xsrf', 'true')
            .send()
            .expect(200)
            .parse(binaryToString);

          const outputRule1: ReturnType<typeof getSimpleRuleOutput> = {
            ...getSimpleRuleOutput('rule-1'),
            actions: [
              {
                group: 'default',
                id: hookAction1.id,
                action_type_id: hookAction1.actionTypeId,
                params: {
                  message:
                    'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
              },
              {
                group: 'default',
                id: hookAction2.id,
                action_type_id: hookAction2.actionTypeId,
                params: {
                  message:
                    'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
              },
            ],
            throttle: '1h',
          };

          const outputRule2: ReturnType<typeof getSimpleRuleOutput> = {
            ...getSimpleRuleOutput('rule-2'),
            actions: [
              {
                group: 'default',
                id: hookAction1.id,
                action_type_id: hookAction1.actionTypeId,
                params: {
                  message:
                    'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
              },
              {
                group: 'default',
                id: hookAction2.id,
                action_type_id: hookAction2.actionTypeId,
                params: {
                  message:
                    'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
              },
            ],
            throttle: '1h',
          };
          const firstRuleParsed = JSON.parse(body.toString().split(/\n/)[0]);
          const secondRuleParsed = JSON.parse(body.toString().split(/\n/)[1]);
          const firstRule = removeServerGeneratedProperties(firstRuleParsed);
          const secondRule = removeServerGeneratedProperties(secondRuleParsed);

          expect(firstRule).to.eql(outputRule2);
          expect(secondRule).to.eql(outputRule1);
        });
      });
    });
  });
};
