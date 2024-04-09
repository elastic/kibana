/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  NOTIFICATION_DEFAULT_FREQUENCY,
  NOTIFICATION_THROTTLE_NO_ACTIONS,
  NOTIFICATION_THROTTLE_RULE,
} from '@kbn/security-solution-plugin/common/constants';
import { RuleActionArray, RuleActionThrottle } from '@kbn/securitysolution-io-ts-alerting-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import {
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleMlRule,
  getSimpleMlRuleOutput,
  getSimpleRuleUpdate,
  getSimpleMlRuleUpdate,
  getSimpleSavedQueryRule,
  getSimpleRule,
  getThresholdRuleForAlertTesting,
  getSimpleRuleWithoutRuleId,
  removeUUIDFromActions,
  updateUsername,
  getActionsWithFrequencies,
  getActionsWithoutFrequencies,
  getSomeActionsWithFrequencies,
} from '../../../utils';
import {
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  createRule,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');
  const es = getService('es');
  // TODO: add a new service for pulling kibana username, similar to getService('es')
  const config = getService('config');
  const ELASTICSEARCH_USERNAME = config.get('servers.kibana.username');

  describe('@ess @serverless @skipInQA update_rules', () => {
    describe('update rules', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should update a single rule property of name using a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's name
        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.rule_id = 'rule-1';
        updatedRule.name = 'some other name';
        delete updatedRule.id;

        const { body } = await securitySolutionApi.updateRule({ body: updatedRule }).expect(200);

        const outputRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it("should update a rule's machine learning job ID if given a legacy job ID format", async () => {
        await createRule(supertest, log, getSimpleMlRule('rule-1'));

        // update rule's machine_learning_job_id
        const updatedRule = getSimpleMlRuleUpdate('rule-1');
        // @ts-expect-error updatedRule is the full union type here and thus is not narrowed to our ML params
        updatedRule.machine_learning_job_id = 'legacy_job_id';
        delete updatedRule.id;

        const { body } = await securitySolutionApi.updateRule({ body: updatedRule }).expect(200);

        const outputRule = updateUsername(getSimpleMlRuleOutput(), ELASTICSEARCH_USERNAME);

        // @ts-expect-error type narrowing is lost due to Omit<>
        outputRule.machine_learning_job_id = ['legacy_job_id'];
        outputRule.revision = 1;
        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should update a single rule property of name using a rule_id with a machine learning job', async () => {
        await createRule(supertest, log, getSimpleMlRule('rule-1'));

        // update a simple rule's name
        const updatedRule = getSimpleMlRuleUpdate('rule-1');
        updatedRule.rule_id = 'rule-1';
        updatedRule.name = 'some other name';
        delete updatedRule.id;

        const { body } = await securitySolutionApi.updateRule({ body: updatedRule }).expect(200);

        const outputRule = updateUsername(getSimpleMlRuleOutput(), ELASTICSEARCH_USERNAME);
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should update a single rule property of name using an auto-generated rule_id', async () => {
        const rule = getSimpleRule('rule-1');
        delete rule.rule_id;
        const createRuleBody = await createRule(supertest, log, rule);

        // update a simple rule's name
        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.rule_id = createRuleBody.rule_id;
        updatedRule.name = 'some other name';
        delete updatedRule.id;

        const { body } = await securitySolutionApi.updateRule({ body: updatedRule }).expect(200);

        const outputRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          ELASTICSEARCH_USERNAME
        );

        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('@brokenInServerless should update a single rule property and remove the action', async () => {
        const [connector1] = await Promise.all([
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
        ]);

        const action1 = {
          group: 'default',
          id: connector1.body.id,
          action_type_id: connector1.body.connector_type_id,
          params: {
            message: 'message',
          },
        };

        const ruleWithConnector: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [action1],
        };
        const createdRule = await createRule(supertest, log, ruleWithConnector);
        expect(createdRule.actions.length).to.eql(1);

        // update a simple rule's name and remove the actions
        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.rule_id = ruleWithConnector.rule_id;
        updatedRule.name = 'some other name';
        delete updatedRule.id;

        const { body } = await securitySolutionApi.updateRule({ body: updatedRule }).expect(200);

        const outputRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          ELASTICSEARCH_USERNAME
        );
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        // Expect an empty array
        outputRule.actions = [];
        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should update a single rule property of name using the auto-generated id', async () => {
        const createdBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's name
        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.name = 'some other name';
        updatedRule.id = createdBody.id;
        delete updatedRule.rule_id;

        const { body } = await securitySolutionApi.updateRule({ body: updatedRule }).expect(200);

        const outputRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should change the revision of a rule when it updates enabled and another property', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's enabled to false and another property
        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.severity = 'low';
        updatedRule.enabled = false;

        const { body } = await securitySolutionApi.updateRule({ body: updatedRule }).expect(200);

        const outputRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

        outputRule.enabled = false;
        outputRule.severity = 'low';
        outputRule.revision = 1;

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should change other properties when it does updates and effectively delete them such as timeline_title', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const ruleUpdate = getSimpleRuleUpdate('rule-1');
        ruleUpdate.timeline_title = 'some title';
        ruleUpdate.timeline_id = 'some id';

        // update a simple rule's timeline_title
        await securitySolutionApi.updateRule({ body: ruleUpdate }).expect(200);

        const ruleUpdate2 = getSimpleRuleUpdate('rule-1');
        ruleUpdate2.name = 'some other name';

        // update a simple rule's name
        const { body } = await securitySolutionApi.updateRule({ body: ruleUpdate2 }).expect(200);

        const outputRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

        outputRule.name = 'some other name';
        outputRule.revision = 2;

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should give a 404 if it is given a fake id', async () => {
        const simpleRule = getSimpleRuleUpdate();
        simpleRule.id = '5096dec6-b6b9-4d8d-8f93-6c2602079d9d';
        delete simpleRule.rule_id;

        const { body } = await securitySolutionApi.updateRule({ body: simpleRule }).expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'id: "5096dec6-b6b9-4d8d-8f93-6c2602079d9d" not found',
        });
      });

      it('should give a 404 if it is given a fake rule_id', async () => {
        const simpleRule = getSimpleRuleUpdate();
        simpleRule.rule_id = 'fake_id';
        delete simpleRule.id;

        const { body } = await securitySolutionApi.updateRule({ body: simpleRule }).expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'rule_id: "fake_id" not found',
        });
      });

      it('should overwrite exception list value on update - non additive', async () => {
        await createRule(supertest, log, {
          ...getSimpleRule('rule-1'),
          exceptions_list: [
            {
              id: '1',
              list_id: '123',
              namespace_type: 'single',
              type: ExceptionListTypeEnum.RULE_DEFAULT,
            },
          ],
        });

        const ruleUpdate = {
          ...getSimpleRuleUpdate('rule-1'),
          exceptions_list: [
            {
              id: '2',
              list_id: '456',
              namespace_type: 'single' as const,
              type: ExceptionListTypeEnum.RULE_DEFAULT,
            },
          ],
        };

        const { body } = await securitySolutionApi.updateRule({ body: ruleUpdate }).expect(200);

        expect(body.exceptions_list).to.eql([
          { id: '2', list_id: '456', namespace_type: 'single', type: 'rule_default' },
        ]);
      });

      it('should throw error if trying to add more than one default exception list', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const ruleUpdate = {
          ...getSimpleRuleUpdate('rule-1'),
          exceptions_list: [
            {
              id: '1',
              list_id: '123',
              namespace_type: 'single' as const,
              type: ExceptionListTypeEnum.RULE_DEFAULT,
            },
            {
              id: '2',
              list_id: '456',
              namespace_type: 'single' as const,
              type: ExceptionListTypeEnum.RULE_DEFAULT,
            },
          ],
        };

        const { body } = await securitySolutionApi.updateRule({ body: ruleUpdate }).expect(500);

        expect(body).to.eql({
          message: 'More than one default exception list found on rule',
          status_code: 500,
        });
      });

      it('should not update a rule if trying to add default rule exception list which attached to another', async () => {
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

        const { body } = await securitySolutionApi
          .updateRule({
            body: {
              ...getSimpleRule('rule-2'),
              exceptions_list: [
                {
                  id: '2',
                  list_id: '123',
                  namespace_type: 'single',
                  type: ExceptionListTypeEnum.RULE_DEFAULT,
                },
              ],
            },
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

        // update a simple rule's name
        const updatedRule = getSimpleRuleUpdate('rule-2');
        updatedRule.id = createdBody.id;
        delete updatedRule.rule_id;

        const { body } = await securitySolutionApi
          .updateRule({
            body: {
              ...updatedRule,
              exceptions_list: [
                {
                  id: '2',
                  list_id: '123',
                  namespace_type: 'single',
                  type: ExceptionListTypeEnum.RULE_DEFAULT,
                },
              ],
            },
          })
          .expect(409);

        expect(body).to.eql({
          message: `default exception list for rule: ${updatedRule.id} already exists in rule(s): ${ruleWithException.id}`,
          status_code: 409,
        });
      });

      describe('threshold validation', () => {
        it('should result in 400 error if no threshold-specific fields are provided', async () => {
          const existingRule = getThresholdRuleForAlertTesting(['*']);
          await createRule(supertest, log, existingRule);

          const { threshold, ...rule } = existingRule;
          // @ts-expect-error we're testing the invalid payload here
          const { body } = await securitySolutionApi.updateRule({ body: rule }).expect(400);

          expect(body).to.eql({
            error: 'Bad Request',
            message: '[request body]: threshold: Required',
            statusCode: 400,
          });
        });

        it('should result in 400 error if more than 3 threshold fields', async () => {
          const existingRule = getThresholdRuleForAlertTesting(['*']);
          await createRule(supertest, log, existingRule);

          const rule = {
            ...existingRule,
            threshold: {
              ...existingRule.threshold,
              field: ['field-1', 'field-2', 'field-3', 'field-4'],
            },
          };
          const { body } = await securitySolutionApi.updateRule({ body: rule }).expect(400);

          expect(body).to.eql({
            message: ['Number of fields must be 3 or less'],
            status_code: 400,
          });
        });

        it('should result in 400 error if threshold value is less than 1', async () => {
          const existingRule = getThresholdRuleForAlertTesting(['*']);
          await createRule(supertest, log, existingRule);

          const rule = {
            ...existingRule,
            threshold: {
              ...existingRule.threshold,
              value: 0,
            },
          };
          const { body } = await securitySolutionApi.updateRule({ body: rule }).expect(400);

          expect(body).to.eql({
            error: 'Bad Request',
            message: '[request body]: threshold.value: Number must be greater than or equal to 1',
            statusCode: 400,
          });
        });

        it('should result in 400 error if cardinality is also an agg field', async () => {
          const existingRule = getThresholdRuleForAlertTesting(['*']);
          await createRule(supertest, log, existingRule);

          const rule = {
            ...existingRule,
            threshold: {
              ...existingRule.threshold,
              cardinality: [
                {
                  field: 'process.name',
                  value: 5,
                },
              ],
            },
          };
          const { body } = await securitySolutionApi.updateRule({ body: rule }).expect(400);

          expect(body).to.eql({
            message: ['Cardinality of a field that is being aggregated on is always 1'],
            status_code: 400,
          });
        });
      });

      describe('saved_query and query rule type', () => {
        it('should allow to save a query rule type as a saved_query rule type', async () => {
          const ruleId = 'rule-1';
          const savedQueryRule = getSimpleSavedQueryRule(ruleId);
          await createRule(supertest, log, getSimpleRule(ruleId));

          const { body: outputRule } = await securitySolutionApi
            .updateRule({ body: savedQueryRule })
            .expect(200);

          expect(outputRule.type).to.be('saved_query');
          expect(outputRule.saved_id).to.be(savedQueryRule.saved_id);
        });

        it('should allow to save a query rule type as a saved_query rule type with undefined query', async () => {
          const ruleId = 'rule-1';
          const savedQueryRule = { ...getSimpleSavedQueryRule(ruleId), query: undefined };
          await createRule(supertest, log, getSimpleRule(ruleId));

          const { body: outputRule } = await securitySolutionApi
            .updateRule({ body: savedQueryRule })
            .expect(200);

          expect(outputRule.type).to.be('saved_query');
          expect(outputRule.saved_id).to.be(savedQueryRule.saved_id);
        });

        it('should allow to save a saved_query rule type as a query rule type', async () => {
          const ruleId = 'rule-1';
          const queryRule = getSimpleRule(ruleId);
          await createRule(supertest, log, getSimpleSavedQueryRule(ruleId));

          const { body: outputRule } = await securitySolutionApi
            .updateRule({ body: queryRule })
            .expect(200);

          expect(outputRule.type).to.be('query');
          expect(outputRule.saved_id).to.be(undefined);
        });
      });

      describe('per-action frequencies', () => {
        const updateSingleRule = async (
          ruleId: string,
          throttle: RuleActionThrottle | undefined,
          actions: RuleActionArray
        ) => {
          // update a simple rule's `throttle` and `actions`
          const ruleToUpdate = getSimpleRuleUpdate();
          ruleToUpdate.throttle = throttle;
          ruleToUpdate.actions = actions;
          ruleToUpdate.id = ruleId;
          delete ruleToUpdate.rule_id;

          const { body: updatedRule } = await securitySolutionApi
            .updateRule({ body: ruleToUpdate })
            .expect(200);

          updatedRule.actions = removeUUIDFromActions(updatedRule.actions);
          return removeServerGeneratedPropertiesIncludingRuleId(updatedRule);
        };

        describe('@brokenInServerless actions without frequencies', () => {
          [undefined, NOTIFICATION_THROTTLE_NO_ACTIONS, NOTIFICATION_THROTTLE_RULE].forEach(
            (throttle) => {
              it(`it sets each action's frequency attribute to default value when 'throttle' is ${throttle}`, async () => {
                const actionsWithoutFrequencies = await getActionsWithoutFrequencies(supertest);

                // create simple rule
                const createdRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

                // update a simple rule's `throttle` and `actions`
                const updatedRule = await updateSingleRule(
                  createdRule.id,
                  throttle,
                  actionsWithoutFrequencies
                );
                const expectedRule = updateUsername(
                  getSimpleRuleOutputWithoutRuleId(),
                  ELASTICSEARCH_USERNAME
                );

                expectedRule.revision = 1;
                expectedRule.actions = actionsWithoutFrequencies.map((action) => ({
                  ...action,
                  frequency: NOTIFICATION_DEFAULT_FREQUENCY,
                }));

                expect(updatedRule).to.eql(expectedRule);
              });
            }
          );

          // Action throttle cannot be shorter than the schedule interval which is by default is 5m
          ['300s', '5m', '3h', '4d'].forEach((throttle) => {
            it(`it correctly transforms 'throttle = ${throttle}' and sets it as a frequency of each action`, async () => {
              const actionsWithoutFrequencies = await getActionsWithoutFrequencies(supertest);

              // create simple rule
              const createdRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

              // update a simple rule's `throttle` and `actions`
              const updatedRule = await updateSingleRule(
                createdRule.id,
                throttle,
                actionsWithoutFrequencies
              );

              const expectedRule = updateUsername(
                getSimpleRuleOutputWithoutRuleId(),
                ELASTICSEARCH_USERNAME
              );
              expectedRule.revision = 1;
              expectedRule.actions = actionsWithoutFrequencies.map((action) => ({
                ...action,
                frequency: { summary: true, throttle, notifyWhen: 'onThrottleInterval' },
              }));

              expect(updatedRule).to.eql(expectedRule);
            });
          });
        });

        describe('@brokenInServerless actions with frequencies', () => {
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

              // update a simple rule's `throttle` and `actions`
              const updatedRule = await updateSingleRule(
                createdRule.id,
                throttle,
                actionsWithFrequencies
              );

              const expectedRule = updateUsername(
                getSimpleRuleOutputWithoutRuleId(),
                ELASTICSEARCH_USERNAME
              );
              expectedRule.revision = 1;
              expectedRule.actions = actionsWithFrequencies;

              expect(updatedRule).to.eql(expectedRule);
            });
          });
        });

        describe('@brokenInServerless some actions with frequencies', () => {
          [undefined, NOTIFICATION_THROTTLE_NO_ACTIONS, NOTIFICATION_THROTTLE_RULE].forEach(
            (throttle) => {
              it(`it overrides each action's frequency attribute to default value when 'throttle' is ${throttle}`, async () => {
                const someActionsWithFrequencies = await getSomeActionsWithFrequencies(supertest);

                // create simple rule
                const createdRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

                // update a simple rule's `throttle` and `actions`
                const updatedRule = await updateSingleRule(
                  createdRule.id,
                  throttle,
                  someActionsWithFrequencies
                );

                const expectedRule = updateUsername(
                  getSimpleRuleOutputWithoutRuleId(),
                  ELASTICSEARCH_USERNAME
                );
                expectedRule.revision = 1;
                expectedRule.actions = someActionsWithFrequencies.map((action) => ({
                  ...action,
                  frequency: action.frequency ?? NOTIFICATION_DEFAULT_FREQUENCY,
                }));

                expect(updatedRule).to.eql(expectedRule);
              });
            }
          );

          // Action throttle cannot be shorter than the schedule interval which is by default is 5m
          ['430s', '7m', '1h', '8d'].forEach((throttle) => {
            it(`it correctly transforms 'throttle = ${throttle}' and overrides frequency attribute of each action`, async () => {
              const someActionsWithFrequencies = await getSomeActionsWithFrequencies(supertest);

              // create simple rule
              const createdRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

              // update a simple rule's `throttle` and `actions`
              const updatedRule = await updateSingleRule(
                createdRule.id,
                throttle,
                someActionsWithFrequencies
              );

              const expectedRule = updateUsername(
                getSimpleRuleOutputWithoutRuleId(),
                ELASTICSEARCH_USERNAME
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

              expect(updatedRule).to.eql(expectedRule);
            });
          });
        });
      });

      describe('investigation_fields', () => {
        it('should overwrite investigation_fields value on update - non additive', async () => {
          await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            investigation_fields: { field_names: ['blob', 'boop'] },
          });

          const ruleUpdate = {
            ...getSimpleRuleUpdate('rule-1'),
            investigation_fields: { field_names: ['foo', 'bar'] },
          };

          const { body } = await securitySolutionApi.updateRule({ body: ruleUpdate }).expect(200);

          expect(body.investigation_fields.field_names).to.eql(['foo', 'bar']);
        });

        it('should unset investigation_fields', async () => {
          await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            investigation_fields: { field_names: ['blob', 'boop'] },
          });

          const ruleUpdate = {
            ...getSimpleRuleUpdate('rule-1'),
            investigation_fields: undefined,
          };

          const { body } = await securitySolutionApi.updateRule({ body: ruleUpdate }).expect(200);

          expect(body.investigation_fields).to.eql(undefined);
        });
      });

      describe('max signals', () => {
        beforeEach(async () => {
          await createAlertsIndex(supertest, log);
        });

        afterEach(async () => {
          await deleteAllAlerts(supertest, log, es);
          await deleteAllRules(supertest, log);
        });

        it('should overwrite max_signals field on update', async () => {
          await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            max_signals: 100,
          });

          const ruleUpdate = {
            ...getSimpleRuleUpdate('rule-1'),
            max_signals: 200,
          };

          const { body } = await securitySolutionApi.updateRule({ body: ruleUpdate }).expect(200);

          expect(body.max_signals).to.eql(200);
        });

        it('should reset max_signals field to default value on update when not present', async () => {
          await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            max_signals: 200,
          });

          const ruleUpdate = {
            ...getSimpleRuleUpdate('rule-1'),
            max_signals: undefined,
          };

          const { body } = await securitySolutionApi.updateRule({ body: ruleUpdate }).expect(200);

          expect(body.max_signals).to.eql(100);
        });

        it('does NOT update a rule when max_signals is less than 1', async () => {
          await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            max_signals: 100,
          });

          const ruleUpdate = {
            ...getSimpleRuleUpdate('rule-1'),
            max_signals: 0,
          };

          const { body } = await securitySolutionApi.updateRule({ body: ruleUpdate }).expect(400);

          expect(body.message).to.be(
            '[request body]: max_signals: Number must be greater than or equal to 1'
          );
        });
      });

      describe('setup guide', () => {
        it('should overwrite setup value on update', async () => {
          await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            setup: 'A setup guide',
          });

          const ruleUpdate = {
            ...getSimpleRuleUpdate('rule-1'),
            setup: 'A different setup guide',
          };

          const { body } = await securitySolutionApi.updateRule({ body: ruleUpdate }).expect(200);

          expect(body.setup).to.eql('A different setup guide');
        });

        it('should reset setup field to empty string on unset', async () => {
          await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            setup: 'A setup guide',
          });

          const ruleUpdate = {
            ...getSimpleRuleUpdate('rule-1'),
            setup: undefined,
          };

          const { body } = await securitySolutionApi.updateRule({ body: ruleUpdate }).expect(200);

          expect(body.setup).to.eql('');
        });
      });
    });
  });
};
