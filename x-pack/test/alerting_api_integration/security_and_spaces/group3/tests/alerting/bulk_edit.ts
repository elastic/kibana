/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SavedObject } from '@kbn/core/server';
import { RuleNotifyWhen, SanitizedRule } from '@kbn/alerting-plugin/common';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import { RawRule } from '@kbn/alerting-plugin/server/types';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { SuperuserAtSpace1, UserAtSpaceScenarios } from '../../../scenarios';
import {
  checkAAD,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getUnauthorizedErrorMessage,
} from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createUpdateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('bulkEdit', () => {
    const es = getService('es');
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle bulk edit of rules appropriately', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'MY action',
              connector_type_id: 'test.noop',
              config: {},
              secrets: {},
            })
            .expect(200);

          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData({ tags: ['foo'] }))
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

          const payload = {
            ids: [createdRule.id],
            operations: [
              {
                operation: 'add',
                field: 'actions',
                value: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                ],
              },
            ],
          };
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_edit`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(payload);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('bulkEdit', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.body).to.eql({
                errors: [
                  {
                    message: 'Unauthorized to get actions',
                    rule: {
                      id: createdRule.id,
                      name: 'abc',
                    },
                  },
                ],
                rules: [],
                skipped: [],
                total: 1,
              });
              expect(response.statusCode).to.eql(200);
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body.rules[0].actions).to.eql([
                {
                  id: createdAction.id,
                  group: 'default',
                  params: {},
                  connector_type_id: 'test.noop',
                  uuid: response.body.rules[0].actions[0].uuid,
                },
              ]);
              expect(response.statusCode).to.eql(200);
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: RULE_SAVED_OBJECT_TYPE,
                id: createdRule.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle bulk edit of multiple rules appropriately', async () => {
          const rules = await Promise.all(
            Array.from({ length: 10 }).map(() =>
              supertest
                .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
                .set('kbn-xsrf', 'foo')
                .send(getTestRuleData({ tags: [`multiple-rules-edit-${scenario.id}`] }))
                .expect(200)
            )
          );

          rules.forEach(({ body: rule }) => {
            objectRemover.add(space.id, rule.id, 'rule', 'alerting');
          });

          const payload = {
            filter: `alert.attributes.tags: "multiple-rules-edit-${scenario.id}"`,
            operations: [
              {
                operation: 'add',
                field: 'tags',
                value: ['tag-A'],
              },
            ],
          };

          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_edit`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(payload);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('bulkEdit', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              response.body.rules.forEach((rule: SanitizedRule) =>
                expect(rule.tags).to.eql([`multiple-rules-edit-${scenario.id}`, 'tag-A'])
              );
              expect(response.body.rules).to.have.length(10);
              expect(response.body.errors).to.have.length(0);
              expect(response.body.total).to.be(10);

              expect(response.statusCode).to.eql(200);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle bulk edit of rules appropriately when consumer is the same as producer', async () => {
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                tags: ['foo'],
                rule_type_id: 'test.restricted-noop',
                consumer: 'alertsRestrictedFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

          const payload = {
            ids: [createdRule.id],
            operations: [
              {
                operation: 'add',
                field: 'tags',
                value: ['tag-A', 'tag-B'],
              },
            ],
          };
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_edit`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(payload);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.body).to.eql({ errors: [], rules: [], skipped: [], total: 0 });
              expect(response.statusCode).to.eql(200);
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage(
                  'bulkEdit',
                  'test.restricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body.rules[0].tags).to.eql(['foo', 'tag-A', 'tag-B']);
              expect(response.statusCode).to.eql(200);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle bulk edit of rules request appropriately when consumer is not the producer', async () => {
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.unrestricted-noop',
                consumer: 'alertsFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

          const payload = {
            ids: [createdRule.id],
            operations: [
              {
                operation: 'add',
                field: 'tags',
                value: ['tag-A', 'tag-B'],
              },
            ],
          };
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_edit`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(payload);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage(
                  'bulkEdit',
                  'test.unrestricted-noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body.rules[0].tags).to.eql(['foo', 'tag-A', 'tag-B']);
              expect(response.statusCode).to.eql(200);

              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle bulk edit of rules request appropriately when consumer is "alerts"', async () => {
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.restricted-noop',
                consumer: 'alerts',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

          const payload = {
            ids: [createdRule.id],
            operations: [
              {
                operation: 'add',
                field: 'tags',
                value: ['tag-A', 'tag-B'],
              },
            ],
          };
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_edit`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(payload);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.body).to.eql({ errors: [], rules: [], skipped: [], total: 0 });
              expect(response.statusCode).to.eql(200);
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage(
                  'bulkEdit',
                  'test.restricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body.rules[0].tags).to.eql(['foo', 'tag-A', 'tag-B']);
              expect(response.statusCode).to.eql(200);

              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle bulk edit of rules when operation is invalid', async () => {
          const payload = {
            filter: '',
            operations: [
              {
                operation: 'invalid',
                field: 'tags',
                value: ['test'],
              },
            ],
          };
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_edit`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(payload);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message:
                  '[request body.operations.0]: types that failed validation:\n- [request body.operations.0.0.operation]: types that failed validation:\n - [request body.operations.0.operation.0]: expected value to equal [add]\n - [request body.operations.0.operation.1]: expected value to equal [delete]\n - [request body.operations.0.operation.2]: expected value to equal [set]\n- [request body.operations.0.1.operation]: types that failed validation:\n - [request body.operations.0.operation.0]: expected value to equal [add]\n - [request body.operations.0.operation.1]: expected value to equal [set]\n- [request body.operations.0.2.operation]: expected value to equal [set]\n- [request body.operations.0.3.operation]: expected value to equal [set]\n- [request body.operations.0.4.operation]: expected value to equal [set]\n- [request body.operations.0.5.operation]: expected value to equal [set]\n- [request body.operations.0.6.operation]: expected value to equal [delete]\n- [request body.operations.0.7.operation]: expected value to equal [set]',
              });
              expect(response.statusCode).to.eql(400);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle bulk edit of rules when operation value type is incorrect', async () => {
          const payload = {
            filter: '',
            operations: [
              {
                operation: 'add',
                field: 'tags',
                value: 'not an array',
              },
            ],
          };
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_edit`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(payload);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message:
                  '[request body.operations.0]: types that failed validation:\n- [request body.operations.0.0.value]: could not parse array value from json input\n- [request body.operations.0.1.field]: expected value to equal [actions]\n- [request body.operations.0.2.operation]: expected value to equal [set]\n- [request body.operations.0.3.operation]: expected value to equal [set]\n- [request body.operations.0.4.operation]: expected value to equal [set]\n- [request body.operations.0.5.operation]: expected value to equal [set]\n- [request body.operations.0.6.operation]: expected value to equal [delete]\n- [request body.operations.0.7.operation]: expected value to equal [set]',
              });
              expect(response.statusCode).to.eql(400);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle bulk edit of rules when operation field is invalid', async () => {
          const payload = {
            filter: '',
            operations: [
              {
                operation: 'add',
                field: 'test',
                value: ['test'],
              },
            ],
          };
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_edit`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(payload);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message:
                  '[request body.operations.0]: types that failed validation:\n- [request body.operations.0.0.field]: expected value to equal [tags]\n- [request body.operations.0.1.field]: expected value to equal [actions]\n- [request body.operations.0.2.operation]: expected value to equal [set]\n- [request body.operations.0.3.operation]: expected value to equal [set]\n- [request body.operations.0.4.operation]: expected value to equal [set]\n- [request body.operations.0.5.operation]: expected value to equal [set]\n- [request body.operations.0.6.operation]: expected value to equal [delete]\n- [request body.operations.0.7.operation]: expected value to equal [set]',
              });
              expect(response.statusCode).to.eql(400);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle bulk edit of rules when both ids and filter supplied in payload', async () => {
          const payload = {
            filter: 'test',
            ids: ['test-id'],
            operations: [
              {
                operation: 'add',
                field: 'tags',
                value: ['test'],
              },
            ],
          };
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_edit`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(payload);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                error: 'Bad Request',
                message:
                  "Both 'filter' and 'ids' are supplied. Define either 'ids' or 'filter' properties in method arguments",
                statusCode: 400,
              });
              expect(response.statusCode).to.eql(400);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't update rule from another space`, async () => {
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData())
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix('other')}/internal/alerting/rules/_bulk_edit`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              ids: [createdRule.id],
              operations: [
                {
                  operation: 'add',
                  field: 'tags',
                  value: ['test'],
                },
              ],
            });

          switch (scenario.id) {
            case 'superuser at space1':
            case 'global_read at space1':
              expect(response.body).to.eql({ rules: [], skipped: [], errors: [], total: 0 });
              expect(response.statusCode).to.eql(200);
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    describe('do NOT delete reference for rule type like', () => {
      it('.esquery', async () => {
        const space1 = UserAtSpaceScenarios[1].space.id;
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(space1)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              params: {
                searchConfiguration: {
                  query: { query: 'host.name:*', language: 'kuery' },
                  index: 'logs-*',
                },
                timeField: '@timestamp',
                searchType: 'searchSource',
                timeWindowSize: 5,
                timeWindowUnit: 'm',
                threshold: [1000],
                thresholdComparator: '>',
                size: 100,
                aggType: 'count',
                groupBy: 'all',
                termSize: 5,
                excludeHitsFromPreviousRun: true,
              },
              consumer: 'alerts',
              schedule: { interval: '1m' },
              tags: [],
              name: 'Es Query',
              rule_type_id: '.es-query',
              actions: [],
            })
          )
          .expect(200);
        objectRemover.add(space1, createdRule.id, 'rule', 'alerting');

        const searchRule = () =>
          es.search<{ references: unknown }>({
            index: '.kibana*',
            query: {
              bool: {
                filter: [
                  {
                    term: {
                      _id: `alert:${createdRule.id}`,
                    },
                  },
                ],
              },
            },
            fields: ['alert.params', 'references'],
          });

        const {
          hits: { hits: alertHitsV1 },
        } = await searchRule();

        await supertest
          .post(`${getUrlPrefix(space1)}/internal/alerting/rules/_bulk_edit`)
          .set('kbn-xsrf', 'foo')
          .send({
            ids: [createdRule.id],
            operations: [{ operation: 'set', field: 'apiKey' }],
          });

        const {
          hits: { hits: alertHitsV2 },
        } = await searchRule();

        expect(alertHitsV1[0].fields).to.eql(alertHitsV2[0].fields);
        expect(alertHitsV1[0]?._source?.references ?? true).to.eql(
          alertHitsV2[0]?._source?.references ?? false
        );
      });
    });

    describe('Actions', () => {
      const { space } = SuperuserAtSpace1;

      it('should add the actions correctly', async () => {
        const { body: createdAction } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'MY action',
            connector_type_id: 'test.noop',
            config: {},
            secrets: {},
          })
          .expect(200);

        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

        const response = await supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_edit`)
          .set('kbn-xsrf', 'foo')
          .send({
            ids: [createdRule.id],
            operations: [
              {
                operation: 'add',
                field: 'actions',
                value: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                  {
                    id: 'system-connector-test.system-action',
                    params: {},
                  },
                ],
              },
            ],
          });

        expect(response.status).to.eql(200);

        const action = response.body.rules[0].actions[0];
        const systemAction = response.body.rules[0].actions[1];
        const { uuid, ...restAction } = action;
        const { uuid: systemActionUuid, ...restSystemAction } = systemAction;

        expect([restAction, restSystemAction]).to.eql([
          {
            id: createdAction.id,
            connector_type_id: 'test.noop',
            group: 'default',
            params: {},
          },
          {
            id: 'system-connector-test.system-action',
            connector_type_id: 'test.system-action',
            params: {},
          },
          ,
        ]);

        const esResponse = await es.get<SavedObject<RawRule>>(
          {
            index: ALERTING_CASES_SAVED_OBJECT_INDEX,
            id: `alert:${response.body.rules[0].id}`,
          },
          { meta: true }
        );

        expect(esResponse.statusCode).to.eql(200);
        expect((esResponse.body._source as any)?.alert.systemActions).to.be(undefined);
        const rawActions = (esResponse.body._source as any)?.alert.actions ?? [];

        const rawAction = rawActions[0];
        const rawSystemAction = rawActions[1];

        const { uuid: rawActionUuid, ...rawActionRest } = rawAction;
        const { uuid: rawSystemActionUuid, ...rawSystemActionRest } = rawSystemAction;

        expect(rawActionRest).to.eql({
          actionRef: 'action_0',
          actionTypeId: 'test.noop',
          params: {},
          group: 'default',
        });

        expect(rawSystemActionRest).to.eql({
          actionRef: 'system_action:system-connector-test.system-action',
          actionTypeId: 'test.system-action',
          params: {},
        });

        expect(rawActionUuid).to.not.be(undefined);
        expect(rawSystemActionUuid).to.not.be(undefined);
      });

      it('should not allow creating a default action without group', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

        const response = await supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_edit`)
          .set('kbn-xsrf', 'foo')
          .send({
            ids: [createdRule.id],
            operations: [
              {
                operation: 'add',
                field: 'actions',
                value: [
                  {
                    id: 'test-id',
                    params: {},
                  },
                ],
              },
            ],
          });

        expect(response.status).to.eql(400);

        expect(response.body).to.eql({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Group is not defined in action test-id',
        });
      });

      it('should throw 400 if the system action is missing required params', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

        const response = await supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_edit`)
          .set('kbn-xsrf', 'foo')
          .send({
            ids: [createdRule.id],
            operations: [
              {
                operation: 'add',
                field: 'actions',
                value: [
                  {
                    id: 'system-connector-test.system-action-connector-adapter',
                    params: {},
                  },
                ],
              },
            ],
          });

        expect(response.status).to.eql(200);
        expect(response.body.errors.length).to.eql(1);

        expect(response.body.errors[0].message).to.eql(
          'Invalid system action params. System action type: test.system-action-connector-adapter - [myParam]: expected value of type [string] but got [undefined]'
        );
      });

      it('strips out properties from system actions that are part of the default actions', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

        for (const propertyToAdd of [
          { group: 'default' },
          {
            frequency: {
              summary: false,
              throttle: '1s',
              notifyWhen: RuleNotifyWhen.THROTTLE,
            },
          },
        ]) {
          const systemActionWithProperty = {
            id: 'system-connector-test.system-action',
            params: {},
            ...propertyToAdd,
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_edit`)
            .set('kbn-xsrf', 'foo')
            .send({
              ids: [createdRule.id],
              operations: [
                {
                  operation: 'add',
                  field: 'actions',
                  value: [systemActionWithProperty],
                },
              ],
            });

          expect(response.status).to.eql(200);
          expect(response.body.rules[0].actions[0][Object.keys(propertyToAdd)[0]]).to.be(undefined);

          const esResponse = await es.get<SavedObject<RawRule>>(
            {
              index: ALERTING_CASES_SAVED_OBJECT_INDEX,
              id: `alert:${response.body.rules[0].id}`,
            },
            { meta: true }
          );

          expect(esResponse.statusCode).to.eql(200);
          expect((esResponse.body._source as any)?.alert.systemActions).to.be(undefined);

          const rawActions = (esResponse.body._source as any)?.alert.actions ?? [];
          expect(rawActions[0][Object.keys(propertyToAdd)[0]]).to.be(undefined);
        }
      });

      it('should throw 400 when using the same system action twice', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

        const response = await supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_edit`)
          .set('kbn-xsrf', 'foo')
          .send({
            ids: [createdRule.id],
            operations: [
              {
                operation: 'add',
                field: 'actions',
                value: [
                  {
                    id: 'system-connector-test.system-action',
                    params: {},
                  },
                  {
                    id: 'system-connector-test.system-action',
                    params: {},
                  },
                ],
              },
            ],
          });

        expect(response.status).to.eql(200);
        expect(response.body.errors.length).to.eql(1);

        expect(response.body.errors[0].message).to.eql('Cannot use the same system action twice');
      });
    });
  });
}
