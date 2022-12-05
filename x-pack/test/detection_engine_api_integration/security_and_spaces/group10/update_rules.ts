/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleMlRule,
  getSimpleMlRuleOutput,
  getSimpleRuleUpdate,
  getSimpleMlRuleUpdate,
  getSimpleSavedQueryRule,
  createRule,
  getSimpleRule,
  createLegacyRuleAction,
  getThresholdRuleForSignalTesting,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('update_rules', () => {
    describe('update rules', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should update a single rule property of name using a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's name
        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.rule_id = 'rule-1';
        updatedRule.name = 'some other name';
        delete updatedRule.id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedRule)
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.version = 2;
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

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedRule)
          .expect(200);

        const outputRule = getSimpleMlRuleOutput();
        // @ts-expect-error type narrowing is lost due to Omit<>
        outputRule.machine_learning_job_id = ['legacy_job_id'];
        outputRule.version = 2;
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

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedRule)
          .expect(200);

        const outputRule = getSimpleMlRuleOutput();
        outputRule.name = 'some other name';
        outputRule.version = 2;
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

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedRule)
          .expect(200);

        const outputRule = getSimpleRuleOutputWithoutRuleId();
        outputRule.name = 'some other name';
        outputRule.version = 2;
        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should update a single rule property and remove the action', async () => {
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

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedRule)
          .expect(200);

        const outputRule = getSimpleRuleOutputWithoutRuleId();
        outputRule.name = 'some other name';
        outputRule.version = 2;
        // Expect an empty array
        outputRule.actions = [];
        // Expect "no_actions"
        outputRule.throttle = 'no_actions';
        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should update a single rule property of name using an auto-generated rule_id and migrate the actions', async () => {
        const rule = getSimpleRule('rule-1');
        delete rule.rule_id;
        const [connector, createRuleBody] = await Promise.all([
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
          createRule(supertest, log, rule),
        ]);
        await createLegacyRuleAction(supertest, createRuleBody.id, connector.body.id);

        const action1 = {
          group: 'default',
          id: connector.body.id,
          action_type_id: connector.body.connector_type_id,
          params: {
            message: 'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
          },
        };
        // update a simple rule's name
        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.rule_id = createRuleBody.rule_id;
        updatedRule.name = 'some other name';
        updatedRule.actions = [action1];
        updatedRule.throttle = '1d';
        delete updatedRule.id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedRule)
          .expect(200);

        const outputRule = getSimpleRuleOutputWithoutRuleId();
        outputRule.name = 'some other name';
        outputRule.version = 2;
        outputRule.actions = [
          {
            action_type_id: '.slack',
            group: 'default',
            id: connector.body.id,
            params: {
              message:
                'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
          },
        ];
        outputRule.throttle = '1d';
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

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedRule)
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.version = 2;
        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should change the version of a rule when it updates enabled and another property', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's enabled to false and another property
        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.severity = 'low';
        updatedRule.enabled = false;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedRule)
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.enabled = false;
        outputRule.severity = 'low';
        outputRule.version = 2;

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should change other properties when it does updates and effectively delete them such as timeline_title', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const ruleUpdate = getSimpleRuleUpdate('rule-1');
        ruleUpdate.timeline_title = 'some title';
        ruleUpdate.timeline_id = 'some id';

        // update a simple rule's timeline_title
        await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(ruleUpdate)
          .expect(200);

        const ruleUpdate2 = getSimpleRuleUpdate('rule-1');
        ruleUpdate2.name = 'some other name';

        // update a simple rule's name
        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(ruleUpdate2)
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.version = 3;

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should give a 404 if it is given a fake id', async () => {
        const simpleRule = getSimpleRuleUpdate();
        simpleRule.id = '5096dec6-b6b9-4d8d-8f93-6c2602079d9d';
        delete simpleRule.rule_id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(simpleRule)
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'id: "5096dec6-b6b9-4d8d-8f93-6c2602079d9d" not found',
        });
      });

      it('should give a 404 if it is given a fake rule_id', async () => {
        const simpleRule = getSimpleRuleUpdate();
        simpleRule.rule_id = 'fake_id';
        delete simpleRule.id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(simpleRule)
          .expect(404);

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
              namespace_type: 'single',
              type: ExceptionListTypeEnum.RULE_DEFAULT,
            },
          ],
        };

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(ruleUpdate)
          .expect(200);

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
        };

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(ruleUpdate)
          .expect(500);

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

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            ...getSimpleRule('rule-2'),
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

        // update a simple rule's name
        const updatedRule = getSimpleRuleUpdate('rule-2');
        updatedRule.id = createdBody.id;
        delete updatedRule.rule_id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            ...updatedRule,
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
          message: `default exception list for rule: ${updatedRule.id} already exists in rule(s): ${ruleWithException.id}`,
          status_code: 409,
        });
      });

      describe('threshold validation', () => {
        it('should result in 400 error if no threshold-specific fields are provided', async () => {
          const existingRule = getThresholdRuleForSignalTesting(['*']);
          await createRule(supertest, log, existingRule);

          const { threshold, ...rule } = existingRule;
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rule)
            .expect(400);

          expect(body).to.eql({
            error: 'Bad Request',
            message: '[request body]: Invalid value "undefined" supplied to "threshold"',
            statusCode: 400,
          });
        });

        it('should result in 400 error if more than 3 threshold fields', async () => {
          const existingRule = getThresholdRuleForSignalTesting(['*']);
          await createRule(supertest, log, existingRule);

          const rule = {
            ...existingRule,
            threshold: {
              ...existingRule.threshold,
              field: ['field-1', 'field-2', 'field-3', 'field-4'],
            },
          };
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rule)
            .expect(400);

          expect(body).to.eql({
            message: ['Number of fields must be 3 or less'],
            status_code: 400,
          });
        });

        it('should result in 400 error if threshold value is less than 1', async () => {
          const existingRule = getThresholdRuleForSignalTesting(['*']);
          await createRule(supertest, log, existingRule);

          const rule = {
            ...existingRule,
            threshold: {
              ...existingRule.threshold,
              value: 0,
            },
          };
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rule)
            .expect(400);

          expect(body).to.eql({
            error: 'Bad Request',
            message: '[request body]: Invalid value "0" supplied to "threshold,value"',
            statusCode: 400,
          });
        });

        it('should result in 400 error if cardinality is also an agg field', async () => {
          const existingRule = getThresholdRuleForSignalTesting(['*']);
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
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rule)
            .expect(400);

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

          const { body: outputRule } = await supertest
            .put(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(savedQueryRule)
            .expect(200);

          expect(outputRule.type).to.be('saved_query');
          expect(outputRule.saved_id).to.be(savedQueryRule.saved_id);
        });

        it('should allow to save a query rule type as a saved_query rule type with undefined query', async () => {
          const ruleId = 'rule-1';
          const savedQueryRule = { ...getSimpleSavedQueryRule(ruleId), query: undefined };
          await createRule(supertest, log, getSimpleRule(ruleId));

          const { body: outputRule } = await supertest
            .put(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(savedQueryRule)
            .expect(200);

          expect(outputRule.type).to.be('saved_query');
          expect(outputRule.saved_id).to.be(savedQueryRule.saved_id);
        });

        it('should allow to save a saved_query rule type as a query rule type', async () => {
          const ruleId = 'rule-1';
          const queryRule = getSimpleRule(ruleId);
          await createRule(supertest, log, getSimpleSavedQueryRule(ruleId));

          const { body: outputRule } = await supertest
            .put(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(queryRule)
            .expect(200);

          expect(outputRule.type).to.be('query');
          expect(outputRule.saved_id).to.be(undefined);
        });
      });
    });
  });
};
