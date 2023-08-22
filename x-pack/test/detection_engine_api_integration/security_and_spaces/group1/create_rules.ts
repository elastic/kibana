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
import { RuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ROLES } from '@kbn/security-solution-plugin/common/test';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllRules,
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  getSimpleMlRule,
  getSimpleMlRuleOutput,
  waitForRuleSuccess,
  getRuleForSignalTesting,
  getRuleForSignalTestingWithTimestampOverride,
  waitForAlertToComplete,
  waitForSignalsToBePresent,
  getThresholdRuleForSignalTesting,
  waitForRulePartialFailure,
  createRule,
  deleteAllAlerts,
} from '../../utils';
import { createUserAndRole, deleteUserAndRole } from '../../../common/services/security_solution';
import {
  getActionsWithFrequencies,
  getActionsWithoutFrequencies,
  getSomeActionsWithFrequencies,
} from '../../utils/get_rule_actions';
import { removeUUIDFromActions } from '../../utils/remove_uuid_from_actions';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');
  const es = getService('es');

  describe('create_rules', () => {
    describe('creating rules', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      describe('saved query', () => {
        it('should create a saved query rule and query a data view', async () => {
          const savedQueryRule = {
            ...getSimpleRule(),
            data_view_id: 'my-data-view',
            type: 'saved_query',
            saved_id: 'my-saved-query-id',
          };
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(savedQueryRule)
            .expect(200);

          expect(body.data_view_id).to.eql('my-data-view');
        });
      });

      describe('elastic admin', () => {
        it('should create a single rule with a rule_id', async () => {
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(getSimpleRule())
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(body);
          expect(bodyToCompare).to.eql(getSimpleRuleOutput());
        });

        /*
         This test is to ensure no future regressions introduced by the following scenario
         a call to updateApiKey was invalidating the api key used by the
         rule while the rule was executing, or even before it executed,
         on the first rule run.
         this pr https://github.com/elastic/kibana/pull/68184
         fixed this by finding the true source of a bug that required the manual
         api key update, and removed the call to that function.

         When the api key is updated before / while the rule is executing, the alert
         executor no longer has access to a service to update the rule status
         saved object in Elasticsearch. Because of this, we cannot set the rule into
         a 'failure' state, so the user ends up seeing 'running' as that is the
         last status set for the rule before it erupts in an error that cannot be
         recorded inside of the executor.

         This adds an e2e test for the backend to catch that in case
         this pops up again elsewhere.
        */
        it('should create a single rule with a rule_id and validate it ran successfully', async () => {
          const rule = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rule)
            .expect(200);

          await waitForRuleSuccess({ supertest, log, id: body.id });
        });

        it('should create a single rule with a rule_id and an index pattern that does not match anything available and partial failure for the rule', async () => {
          const simpleRule = getRuleForSignalTesting(['does-not-exist-*']);
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(simpleRule)
            .expect(200);

          await waitForRulePartialFailure({
            supertest,
            log,
            id: body.id,
          });

          const { body: rule } = await supertest
            .get(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .query({ id: body.id })
            .expect(200);

          // TODO: https://github.com/elastic/kibana/pull/121644 clean up, make type-safe
          expect(rule?.execution_summary?.last_execution.status).to.eql('partial failure');
          expect(rule?.execution_summary?.last_execution.message).to.eql(
            'This rule is attempting to query data from Elasticsearch indices listed in the "Index pattern" section of the rule definition, however no index matching: ["does-not-exist-*"] was found. This warning will continue to appear until a matching index is created or this rule is disabled.'
          );
        });

        it('should create a single rule with a rule_id and an index pattern that does not match anything and an index pattern that does and the rule should be successful', async () => {
          const rule = {
            ...getRuleForSignalTesting(['does-not-exist-*', 'auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rule)
            .expect(200);

          await waitForRuleSuccess({ supertest, log, id: body.id });
        });

        it('should create a single rule without an input index', async () => {
          const rule: RuleCreateProps = {
            name: 'Simple Rule Query',
            description: 'Simple Rule Query',
            enabled: true,
            risk_score: 1,
            rule_id: 'rule-1',
            severity: 'high',
            type: 'query',
            query: 'user.name: root or user.name: admin',
          };
          const expected = {
            actions: [],
            author: [],
            created_by: 'elastic',
            description: 'Simple Rule Query',
            enabled: true,
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            rule_id: 'rule-1',
            language: 'kuery',
            output_index: '',
            max_signals: 100,
            risk_score: 1,
            risk_score_mapping: [],
            name: 'Simple Rule Query',
            query: 'user.name: root or user.name: admin',
            investigation_fields: [],
            references: [],
            related_integrations: [],
            required_fields: [],
            revision: 0,
            setup: '',
            severity: 'high',
            severity_mapping: [],
            updated_by: 'elastic',
            tags: [],
            to: 'now',
            type: 'query',
            threat: [],
            exceptions_list: [],
            version: 1,
          };

          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rule)
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(body);
          expect(bodyToCompare).to.eql(expected);
        });

        it('should create a single rule without a rule_id', async () => {
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(getSimpleRuleWithoutRuleId())
            .expect(200);

          const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
          expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
        });

        it('creates a single Machine Learning rule from a legacy ML Rule format', async () => {
          const legacyMlRule = {
            ...getSimpleMlRule(),
            machine_learning_job_id: 'some_job_id',
          };
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(legacyMlRule)
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(body);
          expect(bodyToCompare).to.eql(getSimpleMlRuleOutput());
        });

        it('should create a single Machine Learning rule', async () => {
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(getSimpleMlRule())
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(body);
          expect(bodyToCompare).to.eql(getSimpleMlRuleOutput());
        });

        it('should cause a 409 conflict if we attempt to create the same rule_id twice', async () => {
          await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(getSimpleRule())
            .expect(200);

          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(getSimpleRule())
            .expect(409);

          expect(body).to.eql({
            message: 'rule_id: "rule-1" already exists',
            status_code: 409,
          });
        });
      });

      describe('exception', () => {
        it('should not create a rule if trying to add more than one default rule exception list', async () => {
          const rule: RuleCreateProps = {
            name: 'Simple Rule Query',
            description: 'Simple Rule Query',
            enabled: true,
            risk_score: 1,
            rule_id: 'rule-1',
            severity: 'high',
            type: 'query',
            query: 'user.name: root or user.name: admin',
            exceptions_list: [
              {
                id: '2',
                list_id: '123',
                namespace_type: 'single',
                type: ExceptionListTypeEnum.RULE_DEFAULT,
              },
              {
                id: '1',
                list_id: '456',
                namespace_type: 'single',
                type: ExceptionListTypeEnum.RULE_DEFAULT,
              },
            ],
          };

          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rule)
            .expect(500);

          expect(body).to.eql({
            message: 'More than one default exception list found on rule',
            status_code: 500,
          });
        });

        it('should not create a rule if trying to add default rule exception list which attached to another', async () => {
          const rule: RuleCreateProps = {
            name: 'Simple Rule Query',
            description: 'Simple Rule Query',
            enabled: true,
            risk_score: 1,
            rule_id: 'rule-1',
            severity: 'high',
            type: 'query',
            query: 'user.name: root or user.name: admin',
            exceptions_list: [
              {
                id: '2',
                list_id: '123',
                namespace_type: 'single',
                type: ExceptionListTypeEnum.RULE_DEFAULT,
              },
            ],
          };

          const { body: ruleWithException } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rule)
            .expect(200);

          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send({ ...rule, rule_id: 'rule-2' })
            .expect(409);

          expect(body).to.eql({
            message: `default exception list already exists in rule(s): ${ruleWithException.id}`,
            status_code: 409,
          });
        });

        it('allow to create a rule if trying to add shared rule exception list which attached to another', async () => {
          const rule: RuleCreateProps = {
            name: 'Simple Rule Query',
            description: 'Simple Rule Query',
            enabled: true,
            risk_score: 1,
            rule_id: 'rule-1',
            severity: 'high',
            type: 'query',
            query: 'user.name: root or user.name: admin',
            exceptions_list: [
              {
                id: '2',
                list_id: '123',
                namespace_type: 'single',
                type: ExceptionListTypeEnum.DETECTION,
              },
            ],
          };

          await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rule)
            .expect(200);

          await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send({ ...rule, rule_id: 'rule-2' })
            .expect(200);
        });
      });

      describe('t1_analyst', () => {
        const role = ROLES.t1_analyst;

        beforeEach(async () => {
          await createUserAndRole(getService, role);
        });

        afterEach(async () => {
          await deleteUserAndRole(getService, role);
        });

        it('should NOT be able to create a rule', async () => {
          await supertestWithoutAuth
            .post(DETECTION_ENGINE_RULES_URL)
            .auth(role, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(getSimpleRule())
            .expect(403);
        });
      });

      describe('threshold validation', () => {
        it('should result in 400 error if no threshold-specific fields are provided', async () => {
          const { threshold, ...rule } = getThresholdRuleForSignalTesting(['*']);
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
          const rule = getThresholdRuleForSignalTesting(['*']);
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send({
              ...rule,
              threshold: {
                ...rule.threshold,
                field: ['field-1', 'field-2', 'field-3', 'field-4'],
              },
            })
            .expect(400);

          expect(body).to.eql({
            message: ['Number of fields must be 3 or less'],
            status_code: 400,
          });
        });

        it('should result in 400 error if threshold value is less than 1', async () => {
          const rule = getThresholdRuleForSignalTesting(['*']);
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send({
              ...rule,
              threshold: {
                ...rule.threshold,
                value: 0,
              },
            })
            .expect(400);

          expect(body).to.eql({
            error: 'Bad Request',
            message: '[request body]: Invalid value "0" supplied to "threshold,value"',
            statusCode: 400,
          });
        });

        it('should result in 400 error if cardinality is also an agg field', async () => {
          const rule = getThresholdRuleForSignalTesting(['*']);
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send({
              ...rule,
              threshold: {
                ...rule.threshold,
                cardinality: [
                  {
                    field: 'process.name',
                    value: 5,
                  },
                ],
              },
            })
            .expect(400);

          expect(body).to.eql({
            message: ['Cardinality of a field that is being aggregated on is always 1'],
            status_code: 400,
          });
        });
      });
    });

    describe('missing timestamps', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
        // to edit these files run the following script
        // cd $HOME/kibana/x-pack && nvm use && node ../scripts/es_archiver edit security_solution/timestamp_override
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override'
        );
      });
      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override'
        );
      });

      it('should create a single rule which has a timestamp override for an index pattern that does not exist and write a partial failure status', async () => {
        // defaults to event.ingested timestamp override.
        // event.ingested is one of the timestamp fields set on the es archive data
        // inside of x-pack/test/functional/es_archives/security_solution/timestamp_override/data.json.gz
        const simpleRule = getRuleForSignalTestingWithTimestampOverride(['myfakeindex-1']);
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(simpleRule)
          .expect(200);
        const bodyId = body.id;

        await waitForAlertToComplete(supertest, log, bodyId);
        await waitForRulePartialFailure({
          supertest,
          log,
          id: bodyId,
        });

        const { body: rule } = await supertest
          .get(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .query({ id: bodyId })
          .expect(200);

        // TODO: https://github.com/elastic/kibana/pull/121644 clean up, make type-safe
        expect(rule?.execution_summary?.last_execution.status).to.eql('partial failure');
        expect(rule?.execution_summary?.last_execution.message).to.eql(
          'The following indices are missing the timestamp override field "event.ingested": ["myfakeindex-1"]'
        );
      });

      it('should create a single rule which has a timestamp override and generates two signals with a "partial failure" status', async () => {
        // defaults to event.ingested timestamp override.
        // event.ingested is one of the timestamp fields set on the es archive data
        // inside of x-pack/test/functional/es_archives/security_solution/timestamp_override/data.json.gz
        const simpleRule = getRuleForSignalTestingWithTimestampOverride(['myfa*']);
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(simpleRule)
          .expect(200);
        const bodyId = body.id;

        await waitForRulePartialFailure({
          supertest,
          log,
          id: bodyId,
        });
        await waitForSignalsToBePresent(supertest, log, 2, [bodyId]);

        const { body: rule } = await supertest
          .get(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .query({ id: bodyId })
          .expect(200);

        // TODO: https://github.com/elastic/kibana/pull/121644 clean up, make type-safe
        expect(rule?.execution_summary?.last_execution.status).to.eql('partial failure');
      });
    });

    describe('per-action frequencies', () => {
      const createSingleRule = async (rule: RuleCreateProps) => {
        const createdRule = await createRule(supertest, log, rule);
        createdRule.actions = removeUUIDFromActions(createdRule.actions);
        return createdRule;
      };

      describe('actions without frequencies', () => {
        [undefined, NOTIFICATION_THROTTLE_NO_ACTIONS, NOTIFICATION_THROTTLE_RULE].forEach(
          (throttle) => {
            it(`it sets each action's frequency attribute to default value when 'throttle' is ${throttle}`, async () => {
              const actionsWithoutFrequencies = await getActionsWithoutFrequencies(supertest);

              const simpleRule = getSimpleRule();
              simpleRule.throttle = throttle;
              simpleRule.actions = actionsWithoutFrequencies;

              const createdRule = await createSingleRule(simpleRule);

              const expectedRule = getSimpleRuleOutput();
              expectedRule.actions = actionsWithoutFrequencies.map((action) => ({
                ...action,
                frequency: NOTIFICATION_DEFAULT_FREQUENCY,
              }));

              const rule = removeServerGeneratedProperties(createdRule);
              expect(rule).to.eql(expectedRule);
            });
          }
        );

        // Action throttle cannot be shorter than the schedule interval which is by default is 5m
        ['300s', '5m', '3h', '4d'].forEach((throttle) => {
          it(`it correctly transforms 'throttle = ${throttle}' and sets it as a frequency of each action`, async () => {
            const actionsWithoutFrequencies = await getActionsWithoutFrequencies(supertest);

            const simpleRule = getSimpleRule();
            simpleRule.throttle = throttle;
            simpleRule.actions = actionsWithoutFrequencies;

            const createdRule = await createSingleRule(simpleRule);

            const expectedRule = getSimpleRuleOutput();
            expectedRule.actions = actionsWithoutFrequencies.map((action) => ({
              ...action,
              frequency: { summary: true, throttle, notifyWhen: 'onThrottleInterval' },
            }));

            const rule = removeServerGeneratedProperties(createdRule);
            expect(rule).to.eql(expectedRule);
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

            const simpleRule = getSimpleRule();
            simpleRule.throttle = throttle;
            simpleRule.actions = actionsWithFrequencies;

            const createdRule = await createSingleRule(simpleRule);

            const expectedRule = getSimpleRuleOutput();
            expectedRule.actions = actionsWithFrequencies;

            const rule = removeServerGeneratedProperties(createdRule);
            expect(rule).to.eql(expectedRule);
          });
        });
      });

      describe('some actions with frequencies', () => {
        [undefined, NOTIFICATION_THROTTLE_NO_ACTIONS, NOTIFICATION_THROTTLE_RULE].forEach(
          (throttle) => {
            it(`it overrides each action's frequency attribute to default value when 'throttle' is ${throttle}`, async () => {
              const someActionsWithFrequencies = await getSomeActionsWithFrequencies(supertest);

              const simpleRule = getSimpleRule();
              simpleRule.throttle = throttle;
              simpleRule.actions = someActionsWithFrequencies;

              const createdRule = await createSingleRule(simpleRule);

              const expectedRule = getSimpleRuleOutput();
              expectedRule.actions = someActionsWithFrequencies.map((action) => ({
                ...action,
                frequency: action.frequency ?? NOTIFICATION_DEFAULT_FREQUENCY,
              }));

              const rule = removeServerGeneratedProperties(createdRule);
              expect(rule).to.eql(expectedRule);
            });
          }
        );

        // Action throttle cannot be shorter than the schedule interval which is by default is 5m
        ['430s', '7m', '1h', '8d'].forEach((throttle) => {
          it(`it correctly transforms 'throttle = ${throttle}' and overrides frequency attribute of each action`, async () => {
            const someActionsWithFrequencies = await getSomeActionsWithFrequencies(supertest);

            const simpleRule = getSimpleRule();
            simpleRule.throttle = throttle;
            simpleRule.actions = someActionsWithFrequencies;

            const createdRule = await createSingleRule(simpleRule);

            const expectedRule = getSimpleRuleOutput();
            expectedRule.actions = someActionsWithFrequencies.map((action) => ({
              ...action,
              frequency: action.frequency ?? {
                summary: true,
                throttle,
                notifyWhen: 'onThrottleInterval',
              },
            }));

            const rule = removeServerGeneratedProperties(createdRule);
            expect(rule).to.eql(expectedRule);
          });
        });
      });
    });
  });
};
