/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  DETECTION_ENGINE_RULES_BULK_CREATE,
  DETECTION_ENGINE_RULES_URL,
  NOTIFICATION_DEFAULT_FREQUENCY,
  NOTIFICATION_THROTTLE_NO_ACTIONS,
  NOTIFICATION_THROTTLE_RULE,
} from '@kbn/security-solution-plugin/common/constants';
import { RuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import {
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  getActionsWithFrequencies,
  getActionsWithoutFrequencies,
  getSomeActionsWithFrequencies,
  removeUUIDFromActions,
} from '../../../utils';
import {
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
  waitForRuleSuccess,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');

  // TODO: https://github.com/elastic/kibana/issues/193184 Delete this file and clean up the code
  describe.skip('@ess @skipInServerless create_rules_bulk', () => {
    describe('deprecations', () => {
      afterEach(async () => {
        await deleteAllRules(supertest, log);
      });

      it('should return a warning header', async () => {
        const { header } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([getSimpleRule()])
          .expect(200);

        expect(header.warning).to.be(
          '299 Kibana "Deprecated endpoint: /api/detection_engine/rules/_bulk_create API is deprecated since v8.2. Please use the /api/detection_engine/rules/_bulk_action API instead. See https://www.elastic.co/guide/en/security/master/rule-api-overview.html for more detail."'
        );
      });
    });

    describe('creating rules in bulk', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should create a single rule with a rule_id', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([getSimpleRule()])
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
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
          ...getRuleForAlertTesting(['auditbeat-*']),
          query: 'process.executable: "/usr/bin/sudo"',
        };
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([rule])
          .expect(200);

        await waitForRuleSuccess({ supertest, log, id: body[0].id });
      });

      it('should create a single rule without a rule_id', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([getSimpleRuleWithoutRuleId()])
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
      });

      it('should return a 200 ok but have a 409 conflict if we attempt to create the same rule_id twice', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([getSimpleRule(), getSimpleRule()])
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: 'rule_id: "rule-1" already exists',
              status_code: 409,
            },
            rule_id: 'rule-1',
          },
        ]);
      });

      it('should return a 200 ok but have a 409 conflict if we attempt to create the same rule_id that already exists', async () => {
        await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([getSimpleRule()])
          .expect(200);

        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'foo')
          .set('elastic-api-version', '2023-10-31')
          .send([getSimpleRule()])
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: 'rule_id: "rule-1" already exists',
              status_code: 409,
            },
            rule_id: 'rule-1',
          },
        ]);
      });

      it('should return a 200 ok but have a 409 conflict if we attempt to create the rule, which use existing attached rule default list', async () => {
        const { body: ruleWithException } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            ...getSimpleRuleWithoutRuleId(),
            exceptions_list: [
              {
                id: '2',
                list_id: '123',
                namespace_type: 'single',
                type: ExceptionListTypeEnum.RULE_DEFAULT,
              },
            ],
          })
          .expect(200);

        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([
            {
              ...getSimpleRule(),
              exceptions_list: [
                {
                  id: '2',
                  list_id: '123',
                  namespace_type: 'single',
                  type: ExceptionListTypeEnum.RULE_DEFAULT,
                },
              ],
            },
          ])
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: `default exception list for rule: rule-1 already exists in rule(s): ${ruleWithException.id}`,
              status_code: 409,
            },
            rule_id: 'rule-1',
          },
        ]);
      });

      it('should return a 409 if several rules has the same exception rule default list', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([
            {
              ...getSimpleRule(),
              exceptions_list: [
                {
                  id: '2',
                  list_id: '123',
                  namespace_type: 'single',
                  type: ExceptionListTypeEnum.RULE_DEFAULT,
                },
              ],
            },
            {
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
            {
              ...getSimpleRuleWithoutRuleId(),
              exceptions_list: [
                {
                  id: '2',
                  list_id: '123',
                  namespace_type: 'single',
                  type: ExceptionListTypeEnum.RULE_DEFAULT,
                },
              ],
            },
          ])
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: 'default exceptions list 2 for rule rule-1 is duplicated',
              status_code: 409,
            },
            rule_id: 'rule-1',
          },
          {
            error: {
              message: 'default exceptions list 2 for rule rule-2 is duplicated',
              status_code: 409,
            },
            rule_id: 'rule-2',
          },
          {
            error: {
              message: 'default exceptions list 2 is duplicated',
              status_code: 409,
            },
            rule_id: '(unknown id)',
          },
        ]);
      });

      describe('per-action frequencies', () => {
        const bulkCreateSingleRule = async (rule: RuleCreateProps) => {
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_BULK_CREATE)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .send([rule])
            .expect(200);

          const createdRule = body[0];
          createdRule.actions = removeUUIDFromActions(createdRule.actions);
          return removeServerGeneratedPropertiesIncludingRuleId(createdRule);
        };

        describe('actions without frequencies', () => {
          [undefined, NOTIFICATION_THROTTLE_NO_ACTIONS, NOTIFICATION_THROTTLE_RULE].forEach(
            (throttle) => {
              it(`it sets each action's frequency attribute to default value when 'throttle' is ${throttle}`, async () => {
                const actionsWithoutFrequencies = await getActionsWithoutFrequencies(supertest);

                const simpleRule = getSimpleRuleWithoutRuleId();
                simpleRule.throttle = throttle;
                simpleRule.actions = actionsWithoutFrequencies;

                const createdRule = await bulkCreateSingleRule(simpleRule);

                const expectedRule = getSimpleRuleOutputWithoutRuleId();
                expectedRule.actions = actionsWithoutFrequencies.map((action) => ({
                  ...action,
                  frequency: NOTIFICATION_DEFAULT_FREQUENCY,
                }));

                expect(createdRule).to.eql(expectedRule);
              });
            }
          );

          // Action throttle cannot be shorter than the schedule interval which is by default is 5m
          ['300s', '5m', '3h', '4d'].forEach((throttle) => {
            it(`it correctly transforms 'throttle = ${throttle}' and sets it as a frequency of each action`, async () => {
              const actionsWithoutFrequencies = await getActionsWithoutFrequencies(supertest);

              const simpleRule = getSimpleRuleWithoutRuleId();
              simpleRule.throttle = throttle;
              simpleRule.actions = actionsWithoutFrequencies;

              const createdRule = await bulkCreateSingleRule(simpleRule);

              const expectedRule = getSimpleRuleOutputWithoutRuleId();
              expectedRule.actions = actionsWithoutFrequencies.map((action) => ({
                ...action,
                frequency: { summary: true, throttle, notifyWhen: 'onThrottleInterval' },
              }));

              expect(createdRule).to.eql(expectedRule);
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

              const simpleRule = getSimpleRuleWithoutRuleId();
              simpleRule.throttle = throttle;
              simpleRule.actions = actionsWithFrequencies;

              const createdRule = await bulkCreateSingleRule(simpleRule);

              const expectedRule = getSimpleRuleOutputWithoutRuleId();
              expectedRule.actions = actionsWithFrequencies;

              expect(createdRule).to.eql(expectedRule);
            });
          });
        });

        describe('some actions with frequencies', () => {
          [undefined, NOTIFICATION_THROTTLE_NO_ACTIONS, NOTIFICATION_THROTTLE_RULE].forEach(
            (throttle) => {
              it(`it overrides each action's frequency attribute to default value when 'throttle' is ${throttle}`, async () => {
                const someActionsWithFrequencies = await getSomeActionsWithFrequencies(supertest);

                const simpleRule = getSimpleRuleWithoutRuleId();
                simpleRule.throttle = throttle;
                simpleRule.actions = someActionsWithFrequencies;

                const createdRule = await bulkCreateSingleRule(simpleRule);

                const expectedRule = getSimpleRuleOutputWithoutRuleId();
                expectedRule.actions = someActionsWithFrequencies.map((action) => ({
                  ...action,
                  frequency: action.frequency ?? NOTIFICATION_DEFAULT_FREQUENCY,
                }));

                expect(createdRule).to.eql(expectedRule);
              });
            }
          );

          // Action throttle cannot be shorter than the schedule interval which is by default is 5m
          ['430s', '7m', '1h', '8d'].forEach((throttle) => {
            it(`it correctly transforms 'throttle = ${throttle}' and overrides frequency attribute of each action`, async () => {
              const someActionsWithFrequencies = await getSomeActionsWithFrequencies(supertest);

              const simpleRule = getSimpleRuleWithoutRuleId();
              simpleRule.throttle = throttle;
              simpleRule.actions = someActionsWithFrequencies;

              const createdRule = await bulkCreateSingleRule(simpleRule);

              const expectedRule = getSimpleRuleOutputWithoutRuleId();
              expectedRule.actions = someActionsWithFrequencies.map((action) => ({
                ...action,
                frequency: action.frequency ?? {
                  summary: true,
                  throttle,
                  notifyWhen: 'onThrottleInterval',
                },
              }));

              expect(createdRule).to.eql(expectedRule);
            });
          });
        });
      });

      describe('legacy investigation fields', () => {
        it('should error trying to create a rule with legacy investigation fields format', async () => {
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_BULK_CREATE)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .send([{ ...getSimpleRule(), investigation_fields: ['foo'] }])
            .expect(400);

          expect(body.message).to.eql(
            '[request body]: 0.investigation_fields: Expected object, received array'
          );
        });
      });
    });
  });
};
