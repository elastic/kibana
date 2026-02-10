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
import type {
  RuleActionArray,
  RuleActionThrottle,
} from '@kbn/securitysolution-io-ts-alerting-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import {
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  createRule,
} from '@kbn/detections-response-ftr-services';
import {
  getSimpleRule,
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleMlRuleOutput,
  getSimpleMlRule,
  getSimpleRuleWithoutRuleId,
  removeUUIDFromActions,
  getActionsWithFrequencies,
  getActionsWithoutFrequencies,
  getSomeActionsWithFrequencies,
  updateUsername,
} from '../../../utils';
import { createUserAndRole, deleteUserAndRole } from '../../../../../config/services/common';

import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');
  const es = getService('es');
  const utils = getService('securitySolutionUtils');

  describe('@ess @serverless @skipInServerlessMKI patch_rules', () => {
    describe('patch rules', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
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
          .set('elastic-api-version', '2023-10-31')
          .send({ rule_id: 'rule-1', name: 'some other name' })
          .expect(200);

        const outputRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());

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
          .set('elastic-api-version', '2023-10-31')
          .send({
            rule_id: 'rule-1',
            machine_learning_job_id: 'some_job_id',
            type: 'machine_learning',
          })
          .expect(200);

        const outputRule = updateUsername(getSimpleMlRuleOutput(), await utils.getUsername());

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should patch a single rule property of name using a rule_id of type "machine learning"', async () => {
        await createRule(supertest, log, getSimpleMlRule('rule-1'));

        // patch a simple rule's name
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({ rule_id: 'rule-1', name: 'some other name' })
          .expect(200);

        const outputRule = updateUsername(getSimpleMlRuleOutput(), await utils.getUsername());

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
          .set('elastic-api-version', '2023-10-31')
          .send({ rule_id: createRuleBody.rule_id, name: 'some other name' })
          .expect(200);

        const outputRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          await utils.getUsername()
        );

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
          .set('elastic-api-version', '2023-10-31')
          .send({ id: createdBody.id, name: 'some other name' })
          .expect(200);
        const outputRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());

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
          .set('elastic-api-version', '2023-10-31')
          .send({ rule_id: 'rule-1', enabled: false })
          .expect(200);

        const outputRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());

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
          .set('elastic-api-version', '2023-10-31')
          .send({ rule_id: 'rule-1', severity: 'low', enabled: false })
          .expect(200);

        const outputRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());
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
          .set('elastic-api-version', '2023-10-31')
          .send({ rule_id: 'rule-1', timeline_title: 'some title', timeline_id: 'some id' })
          .expect(200);

        // patch a simple rule's name
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({ rule_id: 'rule-1', name: 'some other name' })
          .expect(200);

        const outputRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());
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
          .set('elastic-api-version', '2023-10-31')
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
          .set('elastic-api-version', '2023-10-31')
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
          .set('elastic-api-version', '2023-10-31')
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
          .set('elastic-api-version', '2023-10-31')
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
          .set('elastic-api-version', '2023-10-31')
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

      it('should give a 404 if it is given a fake id', async () => {
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
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
          .set('elastic-api-version', '2023-10-31')
          .send({ rule_id: 'fake_id', name: 'some other name' })
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'rule_id: "fake_id" not found',
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
            .set('elastic-api-version', '2023-10-31')
            .send({ rule_id: ruleId, throttle, actions })
            .expect(200);

          patchedRule.actions = removeUUIDFromActions(patchedRule.actions);
          return removeServerGeneratedPropertiesIncludingRuleId(patchedRule);
        };

        describe('actions without frequencies', () => {
          [undefined, NOTIFICATION_THROTTLE_NO_ACTIONS, NOTIFICATION_THROTTLE_RULE].forEach(
            (throttle) => {
              it(`@skipInServerless it sets each action's frequency attribute to default value when 'throttle' is ${throttle}`, async () => {
                const actionsWithoutFrequencies = await getActionsWithoutFrequencies(supertest);

                // create simple rule
                const createdRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

                // patch a simple rule's `throttle` and `actions`
                const patchedRule = await patchSingleRule(
                  createdRule.rule_id,
                  throttle,
                  actionsWithoutFrequencies
                );
                const expectedRule = updateUsername(
                  getSimpleRuleOutputWithoutRuleId(),
                  await utils.getUsername()
                );

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
            it(`@skipInServerless it correctly transforms 'throttle = ${throttle}' and sets it as a frequency of each action`, async () => {
              const actionsWithoutFrequencies = await getActionsWithoutFrequencies(supertest);

              // create simple rule
              const createdRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

              // patch a simple rule's `throttle` and `actions`
              const patchedRule = await patchSingleRule(
                createdRule.rule_id,
                throttle,
                actionsWithoutFrequencies
              );
              const expectedRule = updateUsername(
                getSimpleRuleOutputWithoutRuleId(),
                await utils.getUsername()
              );

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
            it(`@skipInServerless it does not change actions frequency attributes when 'throttle' is '${throttle}'`, async () => {
              const actionsWithFrequencies = await getActionsWithFrequencies(supertest);

              // create simple rule
              const createdRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

              // patch a simple rule's `throttle` and `actions`
              const patchedRule = await patchSingleRule(
                createdRule.rule_id,
                throttle,
                actionsWithFrequencies
              );

              const expectedRule = updateUsername(
                getSimpleRuleOutputWithoutRuleId(),
                await utils.getUsername()
              );

              expectedRule.revision = 1;
              expectedRule.actions = actionsWithFrequencies;

              expect(patchedRule).to.eql(expectedRule);
            });
          });
        });

        describe('@skipInServerless some actions with frequencies', () => {
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
                const expectedRule = updateUsername(
                  getSimpleRuleOutputWithoutRuleId(),
                  await utils.getUsername()
                );

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

              const expectedRule = updateUsername(
                getSimpleRuleOutputWithoutRuleId(),
                await utils.getUsername()
              );
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

    describe('investigation fields', () => {
      describe('investigation_field', () => {
        beforeEach(async () => {
          await createAlertsIndex(supertest, log);
        });

        afterEach(async () => {
          await deleteAllAlerts(supertest, log, es);
          await deleteAllRules(supertest, log);
        });

        it('should overwrite investigation_fields value on patch - non additive', async () => {
          await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            investigation_fields: { field_names: ['blob', 'boop'] },
          });

          const rulePatch = {
            rule_id: 'rule-1',
            investigation_fields: { field_names: ['foo', 'bar'] },
          };

          const { body } = await supertest
            .patch(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .send(rulePatch)
            .expect(200);

          expect(body.investigation_fields.field_names).to.eql(['foo', 'bar']);
        });

        it('should not allow field to be unset', async () => {
          await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            investigation_fields: { field_names: ['blob', 'boop'] },
          });

          const rulePatch = {
            rule_id: 'rule-1',
            investigation_fields: undefined,
          };

          const { body } = await supertest
            .patch(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rulePatch)
            .expect(200);

          expect(body.investigation_fields).to.eql({ field_names: ['blob', 'boop'] });
        });

        it('should not unset investigation_fields if not specified in patch', async () => {
          await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            investigation_fields: { field_names: ['blob', 'boop'] },
          });

          const rulePatch = {
            rule_id: 'rule-1',
            name: 'New name',
          };

          const { body } = await supertest
            .patch(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rulePatch)
            .expect(200);

          expect(body.investigation_fields.field_names).to.eql(['blob', 'boop']);
        });
      });
    });

    describe('RBAC', () => {
      describe('@skipInServerless with rules_read_exceptions_all user role', () => {
        const role = ROLES.rules_read_exceptions_all;

        beforeEach(async () => {
          await deleteAllRules(supertest, log);
          await createUserAndRole(getService, role);
        });

        afterEach(async () => {
          await deleteUserAndRole(getService, role);
        });

        it('should overwrite exception list value on patch', async () => {
          await createRule(supertest, log, getSimpleRule('rule-1'));

          const restrictedUser = { username: 'rules_read_exceptions_all', password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);
          await restrictedApis
            .patchRule({
              body: {
                rule_id: 'rule-1',
                exceptions_list: [
                  {
                    id: '1',
                    list_id: '123',
                    namespace_type: 'single',
                    type: ExceptionListTypeEnum.RULE_DEFAULT,
                  },
                ],
              },
            })
            .expect(200);
          const { body } = await restrictedApis
            .patchRule({
              body: {
                rule_id: 'rule-1',
                exceptions_list: [
                  {
                    id: '2',
                    list_id: '123',
                    namespace_type: 'single',
                    type: ExceptionListTypeEnum.DETECTION,
                  },
                ],
              },
            })
            .expect(200);

          expect(body.exceptions_list).to.eql([
            { id: '2', list_id: '123', namespace_type: 'single', type: 'detection' },
          ]);
        });

        it('should throw error when patching exception list and non-valid read authz field', async () => {
          await createRule(supertest, log, getSimpleRule('rule-1'));

          const restrictedUser = { username: 'rules_read_exceptions_all', password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);
          const { body } = await restrictedApis
            .patchRule({
              body: {
                rule_id: 'rule-1',
                query: 'this should fail in the patch route',
                exceptions_list: [
                  {
                    id: '1',
                    list_id: '123',
                    namespace_type: 'single',
                    type: ExceptionListTypeEnum.RULE_DEFAULT,
                  },
                ],
              },
            })
            .expect(403);
          expect(body.message).to.eql('Unauthorized by "siem" to update "siem.queryRule" rule');
        });

        it('should throw error when patching one non-valid read authz field', async () => {
          await createRule(supertest, log, getSimpleRule('rule-1'));

          const restrictedUser = { username: 'rules_read_exceptions_all', password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);
          const { body } = await restrictedApis
            .patchRule({
              body: {
                rule_id: 'rule-1',
                query: 'this should fail in the patch route',
              },
            })
            .expect(403);
          expect(body.message).to.eql('Unauthorized by "siem" to update "siem.queryRule" rule');
        });
      });

      describe('@skipInServerless with rules_read_exceptions_read user role', () => {
        const role = ROLES.rules_read_exceptions_read;

        beforeEach(async () => {
          await deleteAllRules(supertest, log);
          await createUserAndRole(getService, role);
        });

        afterEach(async () => {
          await deleteUserAndRole(getService, role);
        });

        it('should return unauthorized when patching exception list value', async () => {
          await createRule(supertest, log, getSimpleRule('rule-1'));

          const restrictedUser = { username: 'rules_read_exceptions_all', password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);
          await restrictedApis
            .patchRule({
              body: {
                rule_id: 'rule-1',
                exceptions_list: [
                  {
                    id: '1',
                    list_id: '123',
                    namespace_type: 'single',
                    type: ExceptionListTypeEnum.RULE_DEFAULT,
                  },
                ],
              },
            })
            .expect(401);
        });
      });

      describe('@skipInServerless with rules_read_investigation_guide_all user role', () => {
        const role = ROLES.rules_read_investigation_guide_all;

        beforeEach(async () => {
          await deleteAllRules(supertest, log);
          await createUserAndRole(getService, role);
        });

        afterEach(async () => {
          await deleteUserAndRole(getService, role);
        });

        it('should allow patching note field', async () => {
          await createRule(supertest, log, getSimpleRule('rule-1'));

          const restrictedUser = { username: role, password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);
          const { body } = await restrictedApis
            .patchRule({
              body: {
                rule_id: 'rule-1',
                note: 'Updated investigation guide content',
              },
            })
            .expect(200);

          expect(body.note).to.eql('Updated investigation guide content');
        });

        it('should not allow patching non-investigation-guide fields', async () => {
          await createRule(supertest, log, getSimpleRule('rule-1'));

          const restrictedUser = { username: role, password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);
          await restrictedApis
            .patchRule({
              body: {
                rule_id: 'rule-1',
                name: 'This should fail',
              },
            })
            .expect(403);
        });
      });

      describe('@skipInServerless with rules_read_custom_highlighted_fields_all user role', () => {
        const role = ROLES.rules_read_custom_highlighted_fields_all;

        beforeEach(async () => {
          await deleteAllRules(supertest, log);
          await createUserAndRole(getService, role);
        });

        afterEach(async () => {
          await deleteUserAndRole(getService, role);
        });

        it('should allow patching investigation_fields', async () => {
          await createRule(supertest, log, getSimpleRule('rule-1'));

          const restrictedUser = { username: role, password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);
          const { body } = await restrictedApis
            .patchRule({
              body: {
                rule_id: 'rule-1',
                investigation_fields: { field_names: ['host.name', 'user.name'] },
              },
            })
            .expect(200);

          expect(body.investigation_fields).to.eql({ field_names: ['host.name', 'user.name'] });
        });

        it('should not allow patching non-custom-highlighted-fields fields', async () => {
          await createRule(supertest, log, getSimpleRule('rule-1'));

          const restrictedUser = { username: role, password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);
          await restrictedApis
            .patchRule({
              body: {
                rule_id: 'rule-1',
                name: 'This should fail',
              },
            })
            .expect(403);
        });
      });

      describe('@skipInServerless with rules_read_enable_disable_all user role', () => {
        const role = ROLES.rules_read_enable_disable_all;

        beforeEach(async () => {
          await deleteAllRules(supertest, log);
          await createUserAndRole(getService, role);
        });

        afterEach(async () => {
          await deleteUserAndRole(getService, role);
        });

        it('should allow patching enabled field', async () => {
          await createRule(supertest, log, { ...getSimpleRule('rule-1'), enabled: false });

          const restrictedUser = { username: role, password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);
          const { body } = await restrictedApis
            .patchRule({
              body: {
                rule_id: 'rule-1',
                enabled: true,
              },
            })
            .expect(200);

          expect(body.enabled).to.eql(true);
        });

        it('should allow disabling a rule', async () => {
          await createRule(supertest, log, { ...getSimpleRule('rule-1'), enabled: true });

          const restrictedUser = { username: role, password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);
          const { body } = await restrictedApis
            .patchRule({
              body: {
                rule_id: 'rule-1',
                enabled: false,
              },
            })
            .expect(200);

          expect(body.enabled).to.eql(false);
        });

        it('should not allow patching non-enabled fields', async () => {
          await createRule(supertest, log, getSimpleRule('rule-1'));

          const restrictedUser = { username: role, password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);
          await restrictedApis
            .patchRule({
              body: {
                rule_id: 'rule-1',
                name: 'This should fail',
              },
            })
            .expect(403);
        });
      });

      describe('@skipInServerless with rules_read_multiple_subfeatures_all user role', () => {
        const role = ROLES.rules_read_subfeatures_all;

        beforeEach(async () => {
          await deleteAllRules(supertest, log);
          await createUserAndRole(getService, role);
        });

        afterEach(async () => {
          await deleteUserAndRole(getService, role);
        });

        it('should allow patching multiple subfeature fields at once', async () => {
          await createRule(supertest, log, { ...getSimpleRule('rule-1'), enabled: false });

          const restrictedUser = { username: role, password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);
          const { body } = await restrictedApis
            .patchRule({
              body: {
                rule_id: 'rule-1',
                note: 'Updated investigation guide',
                investigation_fields: { field_names: ['host.name', 'user.name'] },
                enabled: true,
              },
            })
            .expect(200);

          expect(body.note).to.eql('Updated investigation guide');
          expect(body.investigation_fields).to.eql({ field_names: ['host.name', 'user.name'] });
          expect(body.enabled).to.eql(true);
        });

        it('should allow patching a subset of subfeature fields', async () => {
          await createRule(supertest, log, getSimpleRule('rule-1'));

          const restrictedUser = { username: role, password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);
          const { body } = await restrictedApis
            .patchRule({
              body: {
                rule_id: 'rule-1',
                note: 'Just updating the note',
              },
            })
            .expect(200);

          expect(body.note).to.eql('Just updating the note');
        });

        it('should not allow patching non-subfeature fields even with multiple subfeature permissions', async () => {
          await createRule(supertest, log, getSimpleRule('rule-1'));

          const restrictedUser = { username: role, password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);
          await restrictedApis
            .patchRule({
              body: {
                rule_id: 'rule-1',
                note: 'This is allowed',
                name: 'But this should fail',
              },
            })
            .expect(403);
        });

        it('should return 403 with specific error when patching a read-auth field without that subfeature permission', async () => {
          await createRule(supertest, log, getSimpleRule('rule-1'));

          const restrictedUser = { username: role, password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);
          const { body } = await restrictedApis
            .patchRule({
              body: {
                rule_id: 'rule-1',
                note: 'This is allowed',
                // User doens't have exception list edit capabilities
                exceptions_list: [
                  {
                    id: '1',
                    list_id: '123',
                    namespace_type: 'single',
                    type: ExceptionListTypeEnum.DETECTION,
                  },
                ],
              },
            })
            .expect(403);

          expect(body.message).to.eql(
            'The current user does not have the permissions to edit the following fields: exceptions_list'
          );
        });
      });
    });
  });
};
