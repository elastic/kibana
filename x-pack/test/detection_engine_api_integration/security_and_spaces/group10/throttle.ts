/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { CreateRulesSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';
import {
  DETECTION_ENGINE_RULES_URL,
  NOTIFICATION_THROTTLE_NO_ACTIONS,
  NOTIFICATION_THROTTLE_RULE,
} from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getWebHookAction,
  getRuleWithWebHookAction,
  createRule,
  getSimpleRule,
  getRule,
  updateRule,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  /**
   *
   * These tests will ensure that the existing synchronization between the alerting API and its states of:
   *   - "notifyWhen"
   *   - "muteAll"
   *   - "throttle"
   * Work within the security_solution's API and states of "throttle" which currently not a 1 to 1 relationship:
   *
   * Ref:
   * https://www.elastic.co/guide/en/kibana/master/create-and-manage-rules.html#controlling-rules
   * https://www.elastic.co/guide/en/kibana/current/mute-all-alerts-api.html
   * https://www.elastic.co/guide/en/security/current/rules-api-create.html
   */
  describe('throttle', () => {
    describe('adding actions', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      describe('creating a rule', () => {
        it('When creating a new action and attaching it to a rule, the rule should have its kibana alerting "mute_all" set to "false" and notify_when set to "onActiveAlert"', async () => {
          // create a new action
          const { body: hookAction } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          const rule = await createRule(supertest, log, getRuleWithWebHookAction(hookAction.id));
          const {
            body: { mute_all: muteAll, notify_when: notifyWhen },
          } = await supertest.get(`/api/alerting/rule/${rule.id}`);
          expect(muteAll).to.eql(false);
          expect(notifyWhen).to.eql('onActiveAlert');
        });

        it('When creating throttle with "NOTIFICATION_THROTTLE_NO_ACTIONS" set and no actions, the rule should have its kibana alerting "mute_all" set to "true" and notify_when set to "onActiveAlert"', async () => {
          const ruleWithThrottle: CreateRulesSchema = {
            ...getSimpleRule(),
            throttle: NOTIFICATION_THROTTLE_NO_ACTIONS,
          };
          const rule = await createRule(supertest, log, ruleWithThrottle);
          const {
            body: { mute_all: muteAll, notify_when: notifyWhen },
          } = await supertest.get(`/api/alerting/rule/${rule.id}`);
          expect(muteAll).to.eql(true);
          expect(notifyWhen).to.eql('onActiveAlert');
        });

        it('When creating throttle with "NOTIFICATION_THROTTLE_NO_ACTIONS" set and with actions set, the rule should have its kibana alerting "mute_all" set to "true" and notify_when set to "onActiveAlert"', async () => {
          // create a new action
          const { body: hookAction } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          const ruleWithThrottle: CreateRulesSchema = {
            ...getRuleWithWebHookAction(hookAction.id),
            throttle: NOTIFICATION_THROTTLE_NO_ACTIONS,
          };
          const rule = await createRule(supertest, log, ruleWithThrottle);
          const {
            body: { mute_all: muteAll, notify_when: notifyWhen },
          } = await supertest.get(`/api/alerting/rule/${rule.id}`);
          expect(muteAll).to.eql(true);
          expect(notifyWhen).to.eql('onActiveAlert');
        });

        it('When creating throttle with "NOTIFICATION_THROTTLE_RULE" set and no actions, the rule should have its kibana alerting "mute_all" set to "false" and notify_when set to "onActiveAlert"', async () => {
          const ruleWithThrottle: CreateRulesSchema = {
            ...getSimpleRule(),
            throttle: NOTIFICATION_THROTTLE_RULE,
          };
          const rule = await createRule(supertest, log, ruleWithThrottle);
          const {
            body: { mute_all: muteAll, notify_when: notifyWhen },
          } = await supertest.get(`/api/alerting/rule/${rule.id}`);
          expect(muteAll).to.eql(false);
          expect(notifyWhen).to.eql('onActiveAlert');
        });

        // NOTE: This shows A side effect of how we do not set data on side cars anymore where the user is told they have no actions since the array is empty.
        it('When creating throttle with "NOTIFICATION_THROTTLE_RULE" set and no actions, since we do not have any actions, we should get back a throttle of "NOTIFICATION_THROTTLE_NO_ACTIONS"', async () => {
          const ruleWithThrottle: CreateRulesSchema = {
            ...getSimpleRule(),
            throttle: NOTIFICATION_THROTTLE_RULE,
          };
          const rule = await createRule(supertest, log, ruleWithThrottle);
          expect(rule.throttle).to.eql(NOTIFICATION_THROTTLE_NO_ACTIONS);
        });

        it('When creating throttle with "NOTIFICATION_THROTTLE_RULE" set and actions set, the rule should have its kibana alerting "mute_all" set to "false" and notify_when set to "onActiveAlert"', async () => {
          // create a new action
          const { body: hookAction } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          const ruleWithThrottle: CreateRulesSchema = {
            ...getRuleWithWebHookAction(hookAction.id),
            throttle: NOTIFICATION_THROTTLE_RULE,
          };
          const rule = await createRule(supertest, log, ruleWithThrottle);
          const {
            body: { mute_all: muteAll, notify_when: notifyWhen },
          } = await supertest.get(`/api/alerting/rule/${rule.id}`);
          expect(muteAll).to.eql(false);
          expect(notifyWhen).to.eql('onActiveAlert');
        });

        it('When creating throttle with "1h" set and no actions, the rule should have its kibana alerting "mute_all" set to "false" and notify_when set to "onThrottleInterval"', async () => {
          const ruleWithThrottle: CreateRulesSchema = {
            ...getSimpleRule(),
            throttle: '1h',
          };
          const rule = await createRule(supertest, log, ruleWithThrottle);
          const {
            body: { mute_all: muteAll, notify_when: notifyWhen },
          } = await supertest.get(`/api/alerting/rule/${rule.id}`);
          expect(muteAll).to.eql(false);
          expect(notifyWhen).to.eql('onThrottleInterval');
        });

        it('When creating throttle with "1h" set and actions set, the rule should have its kibana alerting "mute_all" set to "false" and notify_when set to "onThrottleInterval"', async () => {
          // create a new action
          const { body: hookAction } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          const ruleWithThrottle: CreateRulesSchema = {
            ...getRuleWithWebHookAction(hookAction.id),
            throttle: '1h',
          };
          const rule = await createRule(supertest, log, ruleWithThrottle);
          const {
            body: { mute_all: muteAll, notify_when: notifyWhen },
          } = await supertest.get(`/api/alerting/rule/${rule.id}`);
          expect(muteAll).to.eql(false);
          expect(notifyWhen).to.eql('onThrottleInterval');
        });
      });

      describe('reading a rule', () => {
        it('When creating a new action and attaching it to a rule, we should return "NOTIFICATION_THROTTLE_RULE" when doing a read', async () => {
          // create a new action
          const { body: hookAction } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          const rule = await createRule(supertest, log, getRuleWithWebHookAction(hookAction.id));
          const readRule = await getRule(supertest, log, rule.rule_id);
          expect(readRule.throttle).to.eql(NOTIFICATION_THROTTLE_RULE);
        });

        it('When creating throttle with "NOTIFICATION_THROTTLE_NO_ACTIONS" set and no actions, we should return "NOTIFICATION_THROTTLE_NO_ACTIONS" when doing a read', async () => {
          const ruleWithThrottle: CreateRulesSchema = {
            ...getSimpleRule(),
            throttle: NOTIFICATION_THROTTLE_NO_ACTIONS,
          };
          const rule = await createRule(supertest, log, ruleWithThrottle);
          const readRule = await getRule(supertest, log, rule.rule_id);
          expect(readRule.throttle).to.eql(NOTIFICATION_THROTTLE_NO_ACTIONS);
        });

        // NOTE: This shows A side effect of how we do not set data on side cars anymore where the user is told they have no actions since the array is empty.
        it('When creating throttle with "NOTIFICATION_THROTTLE_RULE" set and no actions, since we do not have any actions, we should get back a throttle of "NOTIFICATION_THROTTLE_NO_ACTIONS" when doing a read', async () => {
          const ruleWithThrottle: CreateRulesSchema = {
            ...getSimpleRule(),
            throttle: NOTIFICATION_THROTTLE_RULE,
          };
          const rule = await createRule(supertest, log, ruleWithThrottle);
          const readRule = await getRule(supertest, log, rule.rule_id);
          expect(readRule.throttle).to.eql(NOTIFICATION_THROTTLE_NO_ACTIONS);
        });

        it('When creating a new action and attaching it to a rule, if we change the alert to a "muteAll" through the kibana alerting API, we should get back "NOTIFICATION_THROTTLE_NO_ACTIONS" ', async () => {
          // create a new action
          const { body: hookAction } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          const rule = await createRule(supertest, log, getRuleWithWebHookAction(hookAction.id));
          await supertest
            .post(`/api/alerting/rule/${rule.id}/_mute_all`)
            .set('kbn-xsrf', 'true')
            .send()
            .expect(204);
          const readRule = await getRule(supertest, log, rule.rule_id);
          expect(readRule.throttle).to.eql(NOTIFICATION_THROTTLE_NO_ACTIONS);
        });
      });

      describe('updating a rule', () => {
        it('will not change "NOTIFICATION_THROTTLE_RULE" if we update some part of the rule', async () => {
          // create a new action
          const { body: hookAction } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          const ruleWithWebHookAction = getRuleWithWebHookAction(hookAction.id);
          await createRule(supertest, log, ruleWithWebHookAction);
          ruleWithWebHookAction.name = 'some other name';
          const updated = await updateRule(supertest, log, ruleWithWebHookAction);
          expect(updated.throttle).to.eql(NOTIFICATION_THROTTLE_RULE);
        });

        it('will not change the "muteAll" or "notifyWhen" if we update some part of the rule', async () => {
          // create a new action
          const { body: hookAction } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          const ruleWithWebHookAction = getRuleWithWebHookAction(hookAction.id);
          await createRule(supertest, log, ruleWithWebHookAction);
          ruleWithWebHookAction.name = 'some other name';
          const updated = await updateRule(supertest, log, ruleWithWebHookAction);
          const {
            body: { mute_all: muteAll, notify_when: notifyWhen },
          } = await supertest.get(`/api/alerting/rule/${updated.id}`);
          expect(muteAll).to.eql(false);
          expect(notifyWhen).to.eql('onActiveAlert');
        });

        // NOTE: This shows A side effect of how we do not set data on side cars anymore where the user is told they have no actions since the array is empty.
        it('If we update a rule and remove just the actions array it will begin returning a throttle of "NOTIFICATION_THROTTLE_NO_ACTIONS"', async () => {
          // create a new action
          const { body: hookAction } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          const ruleWithWebHookAction = getRuleWithWebHookAction(hookAction.id);
          await createRule(supertest, log, ruleWithWebHookAction);
          ruleWithWebHookAction.actions = [];
          const updated = await updateRule(supertest, log, ruleWithWebHookAction);
          expect(updated.throttle).to.eql(NOTIFICATION_THROTTLE_NO_ACTIONS);
        });
      });

      describe('patching a rule', () => {
        it('will not change "NOTIFICATION_THROTTLE_RULE" if we patch some part of the rule', async () => {
          // create a new action
          const { body: hookAction } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          const ruleWithWebHookAction = getRuleWithWebHookAction(hookAction.id);
          const rule = await createRule(supertest, log, ruleWithWebHookAction);
          // patch a simple rule's name
          await supertest
            .patch(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send({ rule_id: rule.rule_id, name: 'some other name' })
            .expect(200);
          const readRule = await getRule(supertest, log, rule.rule_id);
          expect(readRule.throttle).to.eql(NOTIFICATION_THROTTLE_RULE);
        });

        it('will not change the "muteAll" or "notifyWhen" if we patch part of the rule', async () => {
          // create a new action
          const { body: hookAction } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          const ruleWithWebHookAction = getRuleWithWebHookAction(hookAction.id);
          const rule = await createRule(supertest, log, ruleWithWebHookAction);
          // patch a simple rule's name
          await supertest
            .patch(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send({ rule_id: rule.rule_id, name: 'some other name' })
            .expect(200);
          const {
            body: { mute_all: muteAll, notify_when: notifyWhen },
          } = await supertest.get(`/api/alerting/rule/${rule.id}`);
          expect(muteAll).to.eql(false);
          expect(notifyWhen).to.eql('onActiveAlert');
        });

        // NOTE: This shows A side effect of how we do not set data on side cars anymore where the user is told they have no actions since the array is empty.
        it('If we patch a rule and remove just the actions array it will begin returning a throttle of "NOTIFICATION_THROTTLE_NO_ACTIONS"', async () => {
          // create a new action
          const { body: hookAction } = await supertest
            .post('/api/actions/action')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          const ruleWithWebHookAction = getRuleWithWebHookAction(hookAction.id);
          const rule = await createRule(supertest, log, ruleWithWebHookAction);
          // patch a simple rule's action
          await supertest
            .patch(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send({ rule_id: rule.rule_id, actions: [] })
            .expect(200);
          const readRule = await getRule(supertest, log, rule.rule_id);
          expect(readRule.throttle).to.eql(NOTIFICATION_THROTTLE_NO_ACTIONS);
        });
      });
    });
  });
};
