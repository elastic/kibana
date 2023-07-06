/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  DETECTION_ENGINE_RULES_URL,
  NOTIFICATION_DEFAULT_FREQUENCY,
  NOTIFICATION_THROTTLE_NO_ACTIONS,
  NOTIFICATION_THROTTLE_RULE,
} from '@kbn/security-solution-plugin/common/constants';
import { RuleActionArray, RuleActionThrottle } from '@kbn/securitysolution-io-ts-alerting-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllRules,
  deleteAllAlerts,
  getSimpleRule,
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleMlRuleOutput,
  createRule,
  getSimpleMlRule,
  createLegacyRuleAction,
  getLegacyActionSO,
  getSimpleRuleWithoutRuleId,
} from '../../utils';
import {
  getActionsWithFrequencies,
  getActionsWithoutFrequencies,
  getSomeActionsWithFrequencies,
} from '../../utils/get_rule_actions';
import { removeUUIDFromActions } from '../../utils/remove_uuid_from_actions';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('patch_rules', () => {
    describe('patch rules', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should patch a single rule property of name using a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's name
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-1', name: 'some other name' })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it("should patch a machine_learning rule's job ID if in a legacy format", async () => {
        await createRule(supertest, log, getSimpleMlRule('rule-1'));

        // patch a simple rule's name
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-1', machine_learning_job_id: 'some_job_id' })
          .expect(200);

        const outputRule = getSimpleMlRuleOutput();
        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should patch a single rule property of name using a rule_id of type "machine learning"', async () => {
        await createRule(supertest, log, getSimpleMlRule('rule-1'));

        // patch a simple rule's name
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-1', name: 'some other name' })
          .expect(200);

        const outputRule = getSimpleMlRuleOutput();
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should patch a single rule property of name using the auto-generated rule_id', async () => {
        const rule = getSimpleRule('rule-1');
        delete rule.rule_id;
        const createRuleBody = await createRule(supertest, log, rule);

        // patch a simple rule's name
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: createRuleBody.rule_id, name: 'some other name' })
          .expect(200);

        const outputRule = getSimpleRuleOutputWithoutRuleId();
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should patch a single rule property of name using the auto-generated id', async () => {
        const createdBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's name
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ id: createdBody.id, name: 'some other name' })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should not change the revision of a rule when it patches only enabled', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's enabled to false
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-1', enabled: false })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.enabled = false;

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should change the revision of a rule when it patches enabled and another property', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's enabled to false and another property
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-1', severity: 'low', enabled: false })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.enabled = false;
        outputRule.severity = 'low';
        outputRule.revision = 1;

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should not change other properties when it does patches', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's timeline_title
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-1', timeline_title: 'some title', timeline_id: 'some id' })
          .expect(200);

        // patch a simple rule's name
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-1', name: 'some other name' })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.timeline_title = 'some title';
        outputRule.timeline_id = 'some id';
        outputRule.revision = 2;

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should overwrite exception list value on patch - non additive', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's exceptions_list
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: 'rule-1',
            exceptions_list: [
              {
                id: '1',
                list_id: '123',
                namespace_type: 'single',
                type: ExceptionListTypeEnum.RULE_DEFAULT,
              },
            ],
          })
          .expect(200);

        // patch a simple rule's exceptions_list
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: 'rule-1',
            exceptions_list: [
              {
                id: '2',
                list_id: '123',
                namespace_type: 'single',
                type: ExceptionListTypeEnum.DETECTION,
              },
            ],
          })
          .expect(200);

        expect(body.exceptions_list).to.eql([
          { id: '2', list_id: '123', namespace_type: 'single', type: 'detection' },
        ]);
      });

      it('should throw error if trying to add more than one default exception list', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's exceptions_list
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: 'rule-1',
            exceptions_list: [
              {
                id: '1',
                list_id: '123',
                namespace_type: 'single',
                type: ExceptionListTypeEnum.RULE_DEFAULT,
              },
              {
                id: '2',
                list_id: '456',
                namespace_type: 'single',
                type: ExceptionListTypeEnum.RULE_DEFAULT,
              },
            ],
          })
          .expect(500);

        expect(body).to.eql({
          message: 'More than one default exception list found on rule',
          status_code: 500,
        });
      });

      it('should not patch a rule if trying to add default rule exception list which attached to another', async () => {
        const ruleWithException = await createRule(supertest, log, {
          ...getSimpleRule('rule-1'),
          exceptions_list: [
            {
              id: '2',
              list_id: '123',
              namespace_type: 'single',
              type: ExceptionListTypeEnum.RULE_DEFAULT,
            },
          ],
        });
        await createRule(supertest, log, getSimpleRule('rule-2'));

        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: 'rule-2',
            exceptions_list: [
              {
                id: '2',
                list_id: '123',
                namespace_type: 'single',
                type: ExceptionListTypeEnum.RULE_DEFAULT,
              },
            ],
          })
          .expect(409);

        expect(body).to.eql({
          message: `default exception list for rule: rule-2 already exists in rule(s): ${ruleWithException.id}`,
          status_code: 409,
        });
      });

      it('should not update a rule if trying to add default rule exception list which attached to another using rule.id', async () => {
        const ruleWithException = await createRule(supertest, log, {
          ...getSimpleRule('rule-1'),
          exceptions_list: [
            {
              id: '2',
              list_id: '123',
              namespace_type: 'single',
              type: ExceptionListTypeEnum.RULE_DEFAULT,
            },
          ],
        });
        const createdBody = await createRule(supertest, log, getSimpleRule('rule-2'));

        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            id: createdBody.id,
            exceptions_list: [
              {
                id: '2',
                list_id: '123',
                namespace_type: 'single',
                type: ExceptionListTypeEnum.RULE_DEFAULT,
              },
            ],
          })
          .expect(409);

        expect(body).to.eql({
          message: `default exception list for rule: ${createdBody.id} already exists in rule(s): ${ruleWithException.id}`,
          status_code: 409,
        });
      });

      it('should return the rule with migrated actions after the enable patch', async () => {
        const [connector, rule] = await Promise.all([
          supertest
            .post(`/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My action',
              connector_type_id: '.slack',
              secrets: {
                webhookUrl: 'http://localhost:1234',
              },
            }),
          createRule(supertest, log, getSimpleRule('rule-1')),
        ]);
        await createLegacyRuleAction(supertest, rule.id, connector.body.id);

        // check for legacy sidecar action
        const sidecarActionsResults = await getLegacyActionSO(es);
        expect(sidecarActionsResults.hits.hits.length).to.eql(1);
        expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).to.eql(rule.id);

        // patch disable the rule
        const patchResponse = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ id: rule.id, enabled: false })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(patchResponse.body);
        const outputRule = getSimpleRuleOutput();
        outputRule.actions = [
          {
            action_type_id: '.slack',
            group: 'default',
            id: connector.body.id,
            params: {
              message:
                'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            uuid: bodyToCompare.actions[0].uuid,
            frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
          },
        ];
        outputRule.revision = 1;
        expect(bodyToCompare).to.eql(outputRule);

        // legacy sidecar action should be gone
        const sidecarActionsPostResults = await getLegacyActionSO(es);
        expect(sidecarActionsPostResults.hits.hits.length).to.eql(0);
      });

      it('should give a 404 if it is given a fake id', async () => {
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ id: '5096dec6-b6b9-4d8d-8f93-6c2602079d9d', name: 'some other name' })
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'id: "5096dec6-b6b9-4d8d-8f93-6c2602079d9d" not found',
        });
      });

      it('should give a 404 if it is given a fake rule_id', async () => {
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'fake_id', name: 'some other name' })
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'rule_id: "fake_id" not found',
        });
      });
    });

    describe('patch per-action frequencies', () => {
      const patchSingleRule = async (
        ruleId: string,
        throttle: RuleActionThrottle | undefined,
        actions: RuleActionArray
      ) => {
        const { body: patchedRule } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: ruleId, throttle, actions })
          .expect(200);

        patchedRule.actions = removeUUIDFromActions(patchedRule.actions);
        return removeServerGeneratedPropertiesIncludingRuleId(patchedRule);
      };

      describe('actions without frequencies', () => {
        [undefined, NOTIFICATION_THROTTLE_NO_ACTIONS, NOTIFICATION_THROTTLE_RULE].forEach(
          (throttle) => {
            it(`it sets each action's frequency attribute to default value when 'throttle' is ${throttle}`, async () => {
              const actionsWithoutFrequencies = await getActionsWithoutFrequencies(supertest);

              // create simple rule
              const createdRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

              // patch a simple rule's `throttle` and `actions`
              const patchedRule = await patchSingleRule(
                createdRule.rule_id,
                throttle,
                actionsWithoutFrequencies
              );

              const expectedRule = getSimpleRuleOutputWithoutRuleId();
              expectedRule.revision = 1;
              expectedRule.actions = actionsWithoutFrequencies.map((action) => ({
                ...action,
                frequency: NOTIFICATION_DEFAULT_FREQUENCY,
              }));

              expect(patchedRule).to.eql(expectedRule);
            });
          }
        );

        // Action throttle cannot be shorter than the schedule interval which is by default is 5m
        ['300s', '5m', '3h', '4d'].forEach((throttle) => {
          it(`it correctly transforms 'throttle = ${throttle}' and sets it as a frequency of each action`, async () => {
            const actionsWithoutFrequencies = await getActionsWithoutFrequencies(supertest);

            // create simple rule
            const createdRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

            // patch a simple rule's `throttle` and `actions`
            const patchedRule = await patchSingleRule(
              createdRule.rule_id,
              throttle,
              actionsWithoutFrequencies
            );

            const expectedRule = getSimpleRuleOutputWithoutRuleId();
            expectedRule.revision = 1;
            expectedRule.actions = actionsWithoutFrequencies.map((action) => ({
              ...action,
              frequency: { summary: true, throttle, notifyWhen: 'onThrottleInterval' },
            }));

            expect(patchedRule).to.eql(expectedRule);
          });
        });
      });

      describe('actions with frequencies', () => {
        [
          undefined,
          NOTIFICATION_THROTTLE_NO_ACTIONS,
          NOTIFICATION_THROTTLE_RULE,
          '321s',
          '6m',
          '10h',
          '2d',
        ].forEach((throttle) => {
          it(`it does not change actions frequency attributes when 'throttle' is '${throttle}'`, async () => {
            const actionsWithFrequencies = await getActionsWithFrequencies(supertest);

            // create simple rule
            const createdRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

            // patch a simple rule's `throttle` and `actions`
            const patchedRule = await patchSingleRule(
              createdRule.rule_id,
              throttle,
              actionsWithFrequencies
            );

            const expectedRule = getSimpleRuleOutputWithoutRuleId();
            expectedRule.revision = 1;
            expectedRule.actions = actionsWithFrequencies;

            expect(patchedRule).to.eql(expectedRule);
          });
        });
      });

      describe('some actions with frequencies', () => {
        [undefined, NOTIFICATION_THROTTLE_NO_ACTIONS, NOTIFICATION_THROTTLE_RULE].forEach(
          (throttle) => {
            it(`it overrides each action's frequency attribute to default value when 'throttle' is ${throttle}`, async () => {
              const someActionsWithFrequencies = await getSomeActionsWithFrequencies(supertest);

              // create simple rule
              const createdRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

              // patch a simple rule's `throttle` and `actions`
              const patchedRule = await patchSingleRule(
                createdRule.rule_id,
                throttle,
                someActionsWithFrequencies
              );

              const expectedRule = getSimpleRuleOutputWithoutRuleId();
              expectedRule.revision = 1;
              expectedRule.actions = someActionsWithFrequencies.map((action) => ({
                ...action,
                frequency: action.frequency ?? NOTIFICATION_DEFAULT_FREQUENCY,
              }));

              expect(patchedRule).to.eql(expectedRule);
            });
          }
        );

        // Action throttle cannot be shorter than the schedule interval which is by default is 5m
        ['430s', '7m', '1h', '8d'].forEach((throttle) => {
          it(`it correctly transforms 'throttle = ${throttle}' and overrides frequency attribute of each action`, async () => {
            const someActionsWithFrequencies = await getSomeActionsWithFrequencies(supertest);

            // create simple rule
            const createdRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

            // patch a simple rule's `throttle` and `actions`
            const patchedRule = await patchSingleRule(
              createdRule.rule_id,
              throttle,
              someActionsWithFrequencies
            );

            const expectedRule = getSimpleRuleOutputWithoutRuleId();
            expectedRule.revision = 1;
            expectedRule.actions = someActionsWithFrequencies.map((action) => ({
              ...action,
              frequency: action.frequency ?? {
                summary: true,
                throttle,
                notifyWhen: 'onThrottleInterval',
              },
            }));

            expect(patchedRule).to.eql(expectedRule);
          });
        });
      });
    });
  });
};
