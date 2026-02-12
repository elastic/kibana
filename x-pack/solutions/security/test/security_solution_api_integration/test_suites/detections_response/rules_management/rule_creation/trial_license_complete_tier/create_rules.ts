/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import expect from 'expect';

import {
  DETECTION_ENGINE_RULES_URL,
  NOTIFICATION_DEFAULT_FREQUENCY,
  NOTIFICATION_THROTTLE_NO_ACTIONS,
  NOTIFICATION_THROTTLE_RULE,
} from '@kbn/security-solution-plugin/common/constants';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ROLES } from '@kbn/security-solution-plugin/common/test';

import {
  deleteAllRules,
  waitForRuleSuccess,
  waitForAlertsToBePresent,
  waitForRulePartialFailure,
  deleteAllAlerts,
} from '@kbn/detections-response-ftr-services';
import type TestAgent from 'supertest/lib/agent';
import { v4 as uuidV4 } from 'uuid';
import { createSupertestErrorLogger } from '../../../../edr_workflows/utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  getActionsWithFrequencies,
  getActionsWithoutFrequencies,
  getSomeActionsWithFrequencies,
  getCustomQueryRuleParams,
  getSavedQueryRuleParams,
  getMLRuleParams,
  getThresholdRuleParams,
  generateEvent,
  fetchRule,
  waitForAlertToComplete,
  refreshIndex,
} from '../../../utils';
import { createUserAndRole, deleteUserAndRole } from '../../../../../config/services/common';
import { ROLE } from '../../../../../config/services/security_solution_edr_workflows_roles_users';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');
  const es = getService('es');
  const utils = getService('securitySolutionUtils');
  const rolesUsersProvider = getService('rolesUsersProvider');

  describe('@serverless @ess @serverlessQA create_rules', () => {
    describe('rule creation', () => {
      before(async () => {
        await es.indices.delete({ index: 'logs-test', ignore_unavailable: true });
        await es.indices.create({
          index: 'logs-test',
          mappings: {
            properties: {
              '@timestamp': {
                type: 'date',
              },
            },
          },
        });
      });

      beforeEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      describe('elastic admin', () => {
        it('creates a custom query rule', async () => {
          const username = await utils.getUsername();
          const { body } = await detectionsApi
            .createRule({ body: getCustomQueryRuleParams() })
            .expect(200);

          expect(body).toEqual(
            expect.objectContaining({
              ...getCustomQueryRuleParams(),
              created_by: username,
              updated_by: username,
            })
          );
        });

        it('creates a saved query rule', async () => {
          const username = await utils.getUsername();
          const savedQueryRuleParams = getSavedQueryRuleParams({
            data_view_id: 'my-data-view',
            type: 'saved_query',
            saved_id: 'my-saved-query-id',
          });

          const { body } = await detectionsApi
            .createRule({ body: savedQueryRuleParams })
            .expect(200);

          expect(body).toEqual(
            expect.objectContaining({
              ...savedQueryRuleParams,
              created_by: username,
              updated_by: username,
            })
          );
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
        it('expects rule runs successfully', async () => {
          const {
            body: { id },
          } = await detectionsApi
            .createRule({ body: getCustomQueryRuleParams({ enabled: true }) })
            .expect(200);

          await waitForRuleSuccess({ supertest, log, id });

          const rule = await fetchRule(supertest, { id });

          expect(rule?.execution_summary?.last_execution?.status).toBe('succeeded');
        });

        it('expects rule partial failure due to index pattern matching nothing', async () => {
          const {
            body: { id },
          } = await detectionsApi
            .createRule({
              body: getCustomQueryRuleParams({
                index: ['does-not-exist-*'],
                enabled: true,
              }),
            })
            .expect(200);

          await waitForRulePartialFailure({
            supertest,
            log,
            id,
          });

          const rule = await fetchRule(supertest, { id });

          expect(rule?.execution_summary?.last_execution.status).toBe('partial failure');
          expect(rule?.execution_summary?.last_execution.message).toContain(
            'This rule is attempting to query data from Elasticsearch indices listed in the "Index patterns" section of the rule definition, however no index matching: ["does-not-exist-*"] was found. This warning will continue to appear until a matching index is created or this rule is disabled.'
          );
        });

        it('expects rule runs successfully with only one index pattern matching existing index', async () => {
          const {
            body: { id },
          } = await detectionsApi
            .createRule({
              body: getCustomQueryRuleParams({
                index: ['does-not-exist-*', 'logs-test'],
                enabled: true,
              }),
            })
            .expect(200);

          await waitForRuleSuccess({ supertest, log, id });

          const rule = await fetchRule(supertest, { id });

          expect(rule?.execution_summary?.last_execution?.status).toBe('succeeded');
        });

        it('creates a rule without an input index', async () => {
          const ruleParams = getCustomQueryRuleParams({
            index: undefined,
          });

          const { body } = await detectionsApi.createRule({ body: ruleParams }).expect(200);

          expect(body.index).toBeUndefined();
          expect(body).toEqual(expect.objectContaining(omit(ruleParams, 'index')));
        });

        it('creates a custom query rule without rule_id specified', async () => {
          const ruleParams = getCustomQueryRuleParams({
            rule_id: undefined,
          });

          const { body } = await detectionsApi.createRule({ body: ruleParams }).expect(200);

          expect(body).toEqual(
            expect.objectContaining({ ...ruleParams, rule_id: expect.any(String) })
          );
        });

        it('creates a ML rule with legacy machine_learning_job_id', async () => {
          const { body } = await detectionsApi
            .createRule({ body: getMLRuleParams({ machine_learning_job_id: 'some_job_id' }) })
            .expect(200);

          expect(body).toEqual(
            expect.objectContaining(getMLRuleParams({ machine_learning_job_id: ['some_job_id'] }))
          );
        });

        it('creates a ML rule', async () => {
          const ruleParams = getMLRuleParams({ machine_learning_job_id: ['some_job_id'] });

          const { body } = await detectionsApi.createRule({ body: ruleParams }).expect(200);

          expect(body).toEqual(expect.objectContaining(ruleParams));
        });

        it('causes a 409 conflict if the same rule_id is used twice', async () => {
          await detectionsApi
            .createRule({ body: getCustomQueryRuleParams({ rule_id: 'rule-1' }) })
            .expect(200);

          const { body } = await detectionsApi
            .createRule({ body: getCustomQueryRuleParams({ rule_id: 'rule-1' }) })
            .expect(409);

          expect(body).toEqual({
            message: 'rule_id: "rule-1" already exists',
            status_code: 409,
          });
        });
      });

      describe('exception', () => {
        it('does NOT create a rule if trying to add more than one default rule exception list', async () => {
          const { body } = await detectionsApi
            .createRule({
              body: getCustomQueryRuleParams({
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
              }),
            })
            .expect(500);

          expect(body).toEqual({
            message: 'More than one default exception list found on rule',
            status_code: 500,
          });
        });

        it('does NOT create a rule when there is an attempt to share non sharable exception ("rule_default" type)', async () => {
          const { body: ruleWithException } = await detectionsApi
            .createRule({
              body: getCustomQueryRuleParams({
                rule_id: 'rule-1',
                exceptions_list: [
                  {
                    id: '2',
                    list_id: '123',
                    namespace_type: 'single',
                    type: ExceptionListTypeEnum.RULE_DEFAULT,
                  },
                ],
              }),
            })
            .expect(200);

          const { body } = await detectionsApi
            .createRule({
              body: getCustomQueryRuleParams({
                rule_id: 'rule-2',
                exceptions_list: [
                  {
                    id: '2',
                    list_id: '123',
                    namespace_type: 'single',
                    type: ExceptionListTypeEnum.RULE_DEFAULT,
                  },
                ],
              }),
            })
            .expect(409);

          expect(body).toEqual({
            message: `default exception list already exists in rule(s): ${ruleWithException.id}`,
            status_code: 409,
          });
        });

        it('creates a rule when shared exception type is used ("detection" type)', async () => {
          await detectionsApi
            .createRule({
              body: getCustomQueryRuleParams({
                rule_id: 'rule-1',
                exceptions_list: [
                  {
                    id: '2',
                    list_id: '123',
                    namespace_type: 'single',
                    type: ExceptionListTypeEnum.DETECTION,
                  },
                ],
              }),
            })
            .expect(200);

          await detectionsApi
            .createRule({
              body: getCustomQueryRuleParams({
                rule_id: 'rule-2',
                exceptions_list: [
                  {
                    id: '2',
                    list_id: '123',
                    namespace_type: 'single',
                    type: ExceptionListTypeEnum.DETECTION,
                  },
                ],
              }),
            })
            .expect(200);
        });
      });

      describe('@skipInServerless t1_analyst', () => {
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
            .set('elastic-api-version', '2023-10-31')
            .send(getCustomQueryRuleParams())
            .expect(403);
        });
      });

      describe('threshold validation', () => {
        it('returns HTTP 400 error when NO threshold field is provided', async () => {
          const ruleParams = getThresholdRuleParams();
          const { body } = await detectionsApi
            .createRule({
              // @ts-expect-error we are testing the invalid payload
              body: omit(ruleParams, 'threshold'),
            })
            .expect(400);

          expect(body).toEqual({
            error: 'Bad Request',
            message: '[request body]: threshold: Required',
            statusCode: 400,
          });
        });

        it('returns HTTP 400 error when there are more than 5 threshold fields provided', async () => {
          const { body } = await detectionsApi
            .createRule({
              body: getThresholdRuleParams({
                threshold: {
                  field: ['field-1', 'field-2', 'field-3', 'field-4', 'field-5', 'field-6'],
                  value: 1,
                },
              }),
            })
            .expect(400);

          expect(body).toEqual({
            error: 'Bad Request',
            message: '[request body]: threshold.field: Array must contain at most 5 element(s)',
            statusCode: 400,
          });
        });

        it('returns HTTP 400 error when threshold value is less than 1', async () => {
          const { body } = await detectionsApi
            .createRule({
              body: getThresholdRuleParams({
                threshold: {
                  field: ['field-1'],
                  value: 0,
                },
              }),
            })
            .expect(400);

          expect(body).toEqual({
            error: 'Bad Request',
            message: '[request body]: threshold.value: Number must be greater than or equal to 1',
            statusCode: 400,
          });
        });

        it('returns HTTP 400 error when cardinality is also an agg field', async () => {
          const { body } = await detectionsApi
            .createRule({
              body: getThresholdRuleParams({
                threshold: {
                  field: ['field-1'],
                  value: 1,
                  cardinality: [
                    {
                      field: 'field-1',
                      value: 5,
                    },
                  ],
                },
              }),
            })
            .expect(400);

          expect(body).toEqual({
            message: ['Cardinality of a field that is being aggregated on is always 1'],
            status_code: 400,
          });
        });
      });

      describe('investigation_fields', () => {
        it('creates a rule with investigation_fields', async () => {
          const { body } = await detectionsApi
            .createRule({
              body: getCustomQueryRuleParams({
                investigation_fields: {
                  field_names: ['host.name'],
                },
              }),
            })
            .expect(200);

          expect(body.investigation_fields).toEqual({
            field_names: ['host.name'],
          });
        });

        it('does NOT create a rule with legacy investigation_fields', async () => {
          const { body } = await detectionsApi
            .createRule({
              body: {
                ...getCustomQueryRuleParams(),
                // @ts-expect-error type system doesn't allow to use the legacy format as params for getCustomQueryRuleParams()
                investigation_fields: ['host.name'],
              },
            })
            .expect(400);

          expect(body.message).toBe(
            '[request body]: investigation_fields: Expected object, received array'
          );
        });
      });
    });

    describe('@skipInServerless missing timestamps', () => {
      const EVENTS_INDEX_NAME = 'myfakeindex-1';

      beforeEach(async () => {
        await es.indices.delete({ index: EVENTS_INDEX_NAME, ignore_unavailable: true });
        await es.indices.create({
          index: EVENTS_INDEX_NAME,
          mappings: {
            properties: {
              '@timestamp': {
                type: 'date',
              },
            },
          },
        });
        await es.index({
          index: EVENTS_INDEX_NAME,
          document: generateEvent({ '@timestamp': Date.now() - 1 }),
        });
        await es.index({
          index: EVENTS_INDEX_NAME,
          document: generateEvent({ '@timestamp': Date.now() - 2 }),
        });
        await refreshIndex(es, EVENTS_INDEX_NAME);
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('expects partial failure for a rule with timestamp override and index pattern matching no indices', async () => {
        const {
          body: { id },
        } = await detectionsApi
          .createRule({
            body: getCustomQueryRuleParams({
              index: [EVENTS_INDEX_NAME],
              timestamp_override: 'event.ingested',
              enabled: true,
            }),
          })
          .expect(200);

        await waitForAlertToComplete(supertest, log, id);
        await waitForRulePartialFailure({
          supertest,
          log,
          id,
        });

        const rule = await fetchRule(supertest, { id });

        expect(rule?.execution_summary?.last_execution.status).toEqual('partial failure');
        expect(rule?.execution_summary?.last_execution.message).toEqual(
          `The following indices are missing the timestamp override field "event.ingested": ["${EVENTS_INDEX_NAME}"]`
        );
      });

      it('generates two alerts with a "partial failure" status', async () => {
        const {
          body: { id },
        } = await detectionsApi
          .createRule({
            body: getCustomQueryRuleParams({
              index: [EVENTS_INDEX_NAME],
              timestamp_override: 'event.ingested',
              enabled: true,
            }),
          })
          .expect(200);

        await waitForRulePartialFailure({
          supertest,
          log,
          id,
        });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);

        const rule = await fetchRule(supertest, { id });

        expect(rule?.execution_summary?.last_execution.status).toEqual('partial failure');
      });
    });

    describe('@skipInServerless per-action frequencies', () => {
      beforeEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      describe('actions without frequencies', () => {
        [undefined, NOTIFICATION_THROTTLE_NO_ACTIONS, NOTIFICATION_THROTTLE_RULE].forEach(
          (throttle) => {
            it(`sets each action's frequency attribute to default value when 'throttle' is ${throttle}`, async () => {
              const { body } = await detectionsApi
                .createRule({
                  body: getCustomQueryRuleParams({
                    throttle,
                    actions: await getActionsWithoutFrequencies(supertest),
                  }),
                })
                .expect(200);

              for (const action of body.actions) {
                expect(action.frequency).toEqual(NOTIFICATION_DEFAULT_FREQUENCY);
              }
            });
          }
        );

        ['300s', '5m', '3h', '4d'].forEach((throttle) => {
          it(`transforms correctly 'throttle = ${throttle}' and sets it as a frequency of each action`, async () => {
            const { body } = await detectionsApi
              .createRule({
                body: getCustomQueryRuleParams({
                  // Action throttle cannot be shorter than the schedule interval
                  interval: '5m',
                  throttle,
                  actions: await getActionsWithoutFrequencies(supertest),
                }),
              })
              .expect(200);

            for (const action of body.actions) {
              expect(action.frequency).toEqual({
                summary: true,
                throttle,
                notifyWhen: 'onThrottleInterval',
              });
            }
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
          it(`does NOT change action frequency when 'throttle' is '${throttle}'`, async () => {
            const actionsWithFrequencies = await getActionsWithFrequencies(supertest);
            const { body } = await detectionsApi
              .createRule({
                body: getCustomQueryRuleParams({
                  throttle,
                  actions: actionsWithFrequencies,
                }),
              })
              .expect(200);

            expect(body.actions).toEqual(
              actionsWithFrequencies.map((x) => expect.objectContaining(x))
            );
          });
        });
      });

      describe('some actions with frequencies', () => {
        [undefined, NOTIFICATION_THROTTLE_NO_ACTIONS, NOTIFICATION_THROTTLE_RULE].forEach(
          (throttle) => {
            it(`overrides each action's frequency attribute to default value when 'throttle' is ${throttle}`, async () => {
              const someActionsWithFrequencies = await getSomeActionsWithFrequencies(supertest);
              const { body } = await detectionsApi
                .createRule({
                  body: getCustomQueryRuleParams({
                    throttle,
                    actions: someActionsWithFrequencies,
                  }),
                })
                .expect(200);

              expect(body.actions).toEqual(
                someActionsWithFrequencies.map((x) =>
                  expect.objectContaining(x ?? NOTIFICATION_DEFAULT_FREQUENCY)
                )
              );
            });
          }
        );

        ['430s', '7m', '1h', '8d'].forEach((throttle) => {
          it(`transforms correctly 'throttle = ${throttle}' and overrides frequency attribute of each action`, async () => {
            const someActionsWithFrequencies = await getSomeActionsWithFrequencies(supertest);
            const { body } = await detectionsApi
              .createRule({
                body: getCustomQueryRuleParams({
                  // Action throttle cannot be shorter than the schedule interval
                  interval: '5m',
                  throttle,
                  actions: someActionsWithFrequencies,
                }),
              })
              .expect(200);

            expect(body.actions).toEqual(
              someActionsWithFrequencies.map((x) =>
                expect.objectContaining({
                  frequency: x.frequency ?? {
                    summary: true,
                    throttle,
                    notifyWhen: 'onThrottleInterval',
                  },
                })
              )
            );
          });
        });
      });
    });

    describe('with endpoint response actions', () => {
      let superTestResponseActionsNoAuthz: TestAgent;
      let apiCreatePayload: ReturnType<typeof getCustomQueryRuleParams>;

      before(async () => {
        superTestResponseActionsNoAuthz = await utils.createSuperTestWithCustomRole({
          name: ROLE.endpoint_response_actions_no_access,
          privileges: rolesUsersProvider.loader.getPreDefinedRole(
            ROLE.endpoint_response_actions_no_access
          ),
        });
      });

      beforeEach(async () => {
        apiCreatePayload = getCustomQueryRuleParams({
          rule_id: uuidV4(),
          response_actions: [
            {
              action_type_id: '.endpoint',
              params: { command: 'kill-process', config: { field: '', overwrite: true } },
            },
          ],
        });
      });

      afterEach(async () => {
        await deleteAllRules(supertest, log);
      });

      it('should create rule with response actions when user has authz', async () => {
        const { body } = await detectionsApi.createRule({ body: apiCreatePayload }).expect(200);

        expect(body.response_actions).toEqual(apiCreatePayload.response_actions);
      });

      it('should error creating rule with response actions when user DOES NOT have authz', async () => {
        const { body } = await superTestResponseActionsNoAuthz
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
          .send(apiCreatePayload)
          .expect(403);

        expect(body.message).toEqual(
          'User is not authorized to create/update kill-process response action'
        );
      });
    });
  });
};
