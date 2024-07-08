/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Response as SupertestResponse } from 'supertest';
import { RuleNotifyWhen, RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import { RawRule } from '@kbn/alerting-plugin/server/types';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { SavedObject } from '@kbn/core-saved-objects-api-server';
import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { SuperuserAtSpace1, systemActionScenario, UserAtSpaceScenarios } from '../../../scenarios';
import {
  checkAAD,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  ensureDatetimeIsWithinRange,
  getUnauthorizedErrorMessage,
} from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createUpdateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const es = getService('es');

  function getAlertingTaskById(taskId: string) {
    return supertest
      .get(`/api/alerting_tasks/${taskId}`)
      .expect(200)
      .then((response: SupertestResponse) => response.body);
  }

  describe('update', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    for (const scenario of [...UserAtSpaceScenarios, systemActionScenario]) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle update alert request appropriately', async () => {
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

          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const updatedData = {
            name: 'bcd',
            tags: ['bar'],
            params: {
              foo: true,
            },
            schedule: { interval: '12s' },
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {},
              },
            ],
            throttle: '1m',
            notify_when: 'onThrottleInterval',
          };
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(updatedData);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('update', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              break;
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `Unauthorized to get actions`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'system_actions at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                ...updatedData,
                id: createdAlert.id,
                rule_type_id: 'test.noop',
                running: false,
                consumer: 'alertsFixture',
                created_by: 'elastic',
                enabled: true,
                updated_by: user.username,
                api_key_owner: user.username,
                api_key_created_by_user: false,
                mute_all: false,
                muted_alert_ids: [],
                actions: [
                  {
                    id: createdAction.id,
                    connector_type_id: 'test.noop',
                    group: 'default',
                    params: {},
                    uuid: response.body.actions[0].uuid,
                  },
                ],
                scheduled_task_id: createdAlert.scheduled_task_id,
                created_at: response.body.created_at,
                updated_at: response.body.updated_at,
                execution_status: response.body.execution_status,
                revision: 1,
                ...(response.body.next_run ? { next_run: response.body.next_run } : {}),
                ...(response.body.last_run ? { last_run: response.body.last_run } : {}),
              });
              expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(
                Date.parse(response.body.created_at)
              );
              if (response.body.next_run) {
                expect(Date.parse(response.body.next_run)).to.be.greaterThan(0);
              }
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: RULE_SAVED_OBJECT_TYPE,
                id: createdAlert.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle update alert request appropriately when consumer is the same as producer', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.restricted-noop',
                consumer: 'alertsRestrictedFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const updatedData = {
            name: 'bcd',
            tags: ['bar'],
            params: {
              foo: true,
            },
            schedule: { interval: '12s' },
            actions: [],
            throttle: '1m',
            notify_when: 'onThrottleInterval',
          };
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(updatedData);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage(
                  'update',
                  'test.restricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'system_actions at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                ...updatedData,
                id: createdAlert.id,
                rule_type_id: 'test.restricted-noop',
                running: false,
                consumer: 'alertsRestrictedFixture',
                created_by: 'elastic',
                enabled: true,
                updated_by: user.username,
                api_key_owner: user.username,
                api_key_created_by_user: false,
                mute_all: false,
                muted_alert_ids: [],
                scheduled_task_id: createdAlert.scheduled_task_id,
                created_at: response.body.created_at,
                updated_at: response.body.updated_at,
                execution_status: response.body.execution_status,
                revision: 1,
                ...(response.body.next_run ? { next_run: response.body.next_run } : {}),
                ...(response.body.last_run ? { last_run: response.body.last_run } : {}),
              });
              expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(
                Date.parse(response.body.created_at)
              );
              if (response.body.next_run) {
                expect(Date.parse(response.body.next_run)).to.be.greaterThan(0);
              }
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: RULE_SAVED_OBJECT_TYPE,
                id: createdAlert.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle update alert request appropriately when consumer is not the producer', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.unrestricted-noop',
                consumer: 'alertsFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const updatedData = {
            name: 'bcd',
            tags: ['bar'],
            params: {
              foo: true,
            },
            schedule: { interval: '12s' },
            actions: [],
            throttle: '1m',
            notify_when: 'onThrottleInterval',
          };
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(updatedData);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage(
                  'update',
                  'test.unrestricted-noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'system_actions at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                ...updatedData,
                id: createdAlert.id,
                rule_type_id: 'test.unrestricted-noop',
                running: false,
                consumer: 'alertsFixture',
                created_by: 'elastic',
                enabled: true,
                updated_by: user.username,
                api_key_owner: user.username,
                api_key_created_by_user: false,
                mute_all: false,
                muted_alert_ids: [],
                scheduled_task_id: createdAlert.scheduled_task_id,
                created_at: response.body.created_at,
                updated_at: response.body.updated_at,
                execution_status: response.body.execution_status,
                revision: 1,
                ...(response.body.next_run ? { next_run: response.body.next_run } : {}),
                ...(response.body.last_run ? { last_run: response.body.last_run } : {}),
              });
              expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(
                Date.parse(response.body.created_at)
              );
              if (response.body.next_run) {
                expect(Date.parse(response.body.next_run)).to.be.greaterThan(0);
              }
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: RULE_SAVED_OBJECT_TYPE,
                id: createdAlert.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle update alert request appropriately when consumer is "alerts"', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.restricted-noop',
                consumer: 'alerts',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const updatedData = {
            name: 'bcd',
            tags: ['bar'],
            params: {
              foo: true,
            },
            schedule: { interval: '12s' },
            actions: [],
            throttle: '1m',
            notify_when: 'onThrottleInterval',
          };
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(updatedData);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('update', 'test.restricted-noop', 'alerts'),
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage(
                  'update',
                  'test.restricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'system_actions at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                ...updatedData,
                id: createdAlert.id,
                rule_type_id: 'test.restricted-noop',
                running: false,
                consumer: 'alerts',
                created_by: 'elastic',
                enabled: true,
                updated_by: user.username,
                api_key_owner: user.username,
                api_key_created_by_user: false,
                mute_all: false,
                muted_alert_ids: [],
                scheduled_task_id: createdAlert.scheduled_task_id,
                created_at: response.body.created_at,
                updated_at: response.body.updated_at,
                execution_status: response.body.execution_status,
                revision: 1,
                ...(response.body.next_run ? { next_run: response.body.next_run } : {}),
                ...(response.body.last_run ? { last_run: response.body.last_run } : {}),
              });
              expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(
                Date.parse(response.body.created_at)
              );
              if (response.body.next_run) {
                expect(Date.parse(response.body.next_run)).to.be.greaterThan(0);
              }
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: RULE_SAVED_OBJECT_TYPE,
                id: createdAlert.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should still be able to update when AAD is broken', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          await retry.try(async () => {
            await supertest
              .put(
                `${getUrlPrefix(space.id)}/api/alerts_fixture/saved_object/alert/${createdAlert.id}`
              )
              .set('kbn-xsrf', 'foo')
              .send({
                attributes: {
                  name: 'bar',
                },
              })
              .expect(200);
          });

          const updatedData = {
            name: 'bcd',
            tags: ['bar'],
            params: {
              foo: true,
            },
            schedule: { interval: '12s' },
            actions: [],
            throttle: '1m',
            notify_when: 'onThrottleInterval',
          };
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(updatedData);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('update', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'system_actions at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                ...updatedData,
                id: createdAlert.id,
                rule_type_id: 'test.noop',
                running: false,
                consumer: 'alertsFixture',
                created_by: 'elastic',
                enabled: true,
                updated_by: user.username,
                api_key_owner: user.username,
                api_key_created_by_user: false,
                mute_all: false,
                muted_alert_ids: [],
                scheduled_task_id: createdAlert.scheduled_task_id,
                created_at: response.body.created_at,
                updated_at: response.body.updated_at,
                execution_status: response.body.execution_status,
                revision: 1,
                ...(response.body.next_run ? { next_run: response.body.next_run } : {}),
                ...(response.body.last_run ? { last_run: response.body.last_run } : {}),
              });
              expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(
                Date.parse(response.body.created_at)
              );
              if (response.body.next_run) {
                expect(Date.parse(response.body.next_run)).to.be.greaterThan(0);
              }
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: RULE_SAVED_OBJECT_TYPE,
                id: createdAlert.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle update alert request appropriately when alert name has leading and trailing whitespaces', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const updatedData = {
            name: ' leading and trailing whitespace ',
            tags: ['bar'],
            params: {
              foo: true,
            },
            schedule: { interval: '12s' },
            actions: [],
            throttle: '1m',
            notify_when: 'onActiveAlert',
          };
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(updatedData);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('update', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'system_actions at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.name).to.eql(' leading and trailing whitespace ');
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't update alert from another space`, async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix('other')}/api/alerting/rule/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              name: 'bcd',
              tags: ['bar'],
              params: {
                foo: true,
              },
              schedule: { interval: '12s' },
              throttle: '1m',
              actions: [],
              notify_when: 'onActiveAlert',
            });

          expect(response.statusCode).to.eql(404);
          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'superuser at space1':
            case 'system_actions at space1':
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: `Saved object [alert/${createdAlert.id}] not found`,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle update alert request appropriately when attempting to change alert type', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              name: 'bcd',
              tags: ['bar'],
              throttle: '1m',
              rule_type_id: '1',
              params: {
                foo: true,
              },
              schedule: { interval: '12s' },
              actions: [],
              notify_when: 'onActiveAlert',
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'system_actions at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: '[request body.rule_type_id]: definition for this key is missing',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle update alert request appropriately when payload is empty and invalid', async () => {
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alerting/rule/1`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({});

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'system_actions at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: '[request body.name]: expected value of type [string] but got [undefined]',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`should handle update alert request appropriately when alertTypeConfig isn't valid`, async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.validation',
                params: {
                  param1: 'test',
                },
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              name: 'bcd',
              tags: ['bar'],
              schedule: { interval: '1m' },
              throttle: '1m',
              params: {},
              actions: [],
              notify_when: 'onActiveAlert',
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('update', 'test.validation', 'alertsFixture'),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'system_actions at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message:
                  'params invalid: [param1]: expected value of type [string] but got [undefined]',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle update alert request appropriately when interval schedule is wrong syntax', async () => {
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alerting/rule/1`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(
              getTestRuleData({
                schedule: { interval: '10x' },
                enabled: undefined,
                consumer: undefined,
              })
            );

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'system_actions at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: '[request body.schedule.interval]: string is not a valid duration: 10x',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle updates to an alert schedule by rescheduling the underlying task', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                schedule: { interval: '30m' },
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          await retry.try(async () => {
            const alertTask = (await getAlertingTaskById(createdAlert.scheduled_task_id)).docs[0];
            expect(alertTask.status).to.eql('idle');
            // ensure the alert inital run has completed and it's been rescheduled to half an hour from now
            ensureDatetimeIsWithinRange(Date.parse(alertTask.runAt), 30 * 60 * 1000);
          });

          const updatedData = {
            name: 'bcd',
            tags: ['bar'],
            params: {
              foo: true,
            },
            schedule: { interval: '1m' },
            actions: [],
            throttle: '1m',
            notify_when: 'onThrottleInterval',
          };
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(updatedData);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('update', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'system_actions at space1':
              expect(response.statusCode).to.eql(200);
              await retry.try(async () => {
                const alertTask = (await getAlertingTaskById(createdAlert.scheduled_task_id))
                  .docs[0];
                expect(alertTask.status).to.eql('idle');
                // ensure the alert is rescheduled to a minute from now
                ensureDatetimeIsWithinRange(Date.parse(alertTask.runAt), 60 * 1000);
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle updates for a long running alert type without failing the underlying tasks due to invalidated ApiKey', async () => {
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send({
              enabled: true,
              name: 'abc',
              tags: ['foo'],
              rule_type_id: 'test.longRunning',
              consumer: 'alertsFixture',
              schedule: { interval: '1s' },
              throttle: '1m',
              actions: [],
              params: {},
              notify_when: 'onThrottleInterval',
            })
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');
          const updatedData = {
            name: 'bcd',
            tags: ['bar'],
            params: {
              foo: true,
            },
            schedule: { interval: '1m' },
            actions: [],
            throttle: '1m',
            notify_when: 'onThrottleInterval',
          };

          // Update the rule which should invalidate the first API key
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdRule.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(updatedData);

          // Invoke the invalidate API key task
          await supertest
            .post('/api/alerts_fixture/api_key_invalidation/_run_soon')
            .set('kbn-xsrf', 'xxx')
            .expect(200);

          const statusUpdates: string[] = [];
          await retry.try(async () => {
            const alertTask = (await getAlertingTaskById(createdRule.scheduled_task_id)).docs[0];
            statusUpdates.push(alertTask.status);
            expect(alertTask.status).to.eql('idle');
          });

          expect(statusUpdates.find((status) => status === 'failed')).to.be(undefined);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('update', 'test.longRunning', 'alertsFixture'),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'system_actions at space1':
              expect(response.statusCode).to.eql(200);
              await retry.try(async () => {
                const alertTask = (await getAlertingTaskById(createdRule.scheduled_task_id))
                  .docs[0];
                expect(alertTask.status).to.eql('idle');
                // ensure the alert is rescheduled to a minute from now
                ensureDatetimeIsWithinRange(Date.parse(alertTask.runAt), 60 * 1000);
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle updates to an alert schedule by setting the new schedule for the underlying task', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                schedule: { interval: '1m' },
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          await retry.try(async () => {
            const alertTask = (await getAlertingTaskById(createdAlert.scheduled_task_id)).docs[0];
            expect(alertTask.status).to.eql('idle');
            expect(alertTask.schedule).to.eql({ interval: '1m' });
          });

          const updatedData = {
            name: 'bcd',
            tags: ['bar'],
            params: {
              foo: true,
            },
            schedule: { interval: '1s' },
            actions: [],
            throttle: '1m',
            notify_when: 'onThrottleInterval',
          };
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(updatedData);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('update', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'system_actions at space1':
              expect(response.statusCode).to.eql(200);
              await retry.try(async () => {
                const alertTask = (await getAlertingTaskById(createdAlert.scheduled_task_id))
                  .docs[0];
                expect(alertTask.status).to.eql('idle');
                expect(alertTask.schedule).to.eql({ interval: '1s' });
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle create alert request appropriately with system actions', async () => {
          const connectorId = 'system-connector-test.system-action-kibana-privileges';
          const reference = `actions-enqueue-${scenario.id}:${space.id}:${connectorId}`;

          const systemActionWithKibanaPrivileges = {
            id: connectorId,
            group: 'default',
            params: { index: ES_TEST_INDEX_NAME, reference },
          };

          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData())
            .expect(200);

          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const updatedData = {
            name: 'bcd',
            tags: ['bar'],
            params: {
              foo: true,
            },
            schedule: { interval: '12s' },
            actions: [systemActionWithKibanaPrivileges],
            throttle: '1m',
            notify_when: 'onThrottleInterval',
          };

          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(updatedData);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('update', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              break;
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to execute actions',
                statusCode: 403,
              });
              break;
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `Unauthorized to get actions`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'system_actions at space1':
              expect(response.statusCode).to.eql(200);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    describe('Actions', () => {
      const { user, space } = SuperuserAtSpace1;

      it('should update a rule with actions correctly', async () => {
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

        const updateResponse = await supertestWithoutAuth
          .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdRule.id}`)
          .set('kbn-xsrf', 'foo')
          .auth(user.username, user.password)
          .send({
            name: 'bcd',
            tags: ['bar'],
            params: {
              foo: true,
            },
            schedule: { interval: '12s' },
            throttle: '1m',
            notify_when: 'onThrottleInterval',
            actions: [
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
          })
          .expect(200);

        objectRemover.add(space.id, updateResponse.body.id, 'rule', 'alerting');

        const action = updateResponse.body.actions[0];
        const systemAction = updateResponse.body.actions[1];
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
            id: `alert:${updateResponse.body.id}`,
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

      it('should throw 400 if the system action is missing required params', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

        await supertestWithoutAuth
          .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdRule.id}`)
          .set('kbn-xsrf', 'foo')
          .auth(user.username, user.password)
          .send({
            name: 'bcd',
            tags: ['bar'],
            params: {
              foo: true,
            },
            schedule: { interval: '12s' },
            throttle: '1m',
            notify_when: 'onThrottleInterval',
            actions: [
              {
                params: {},
              },
            ],
          })
          .expect(400);
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
              notify_when: RuleNotifyWhen.THROTTLE,
            },
          },
          {
            alerts_filter: {
              query: { kql: 'kibana.alert.rule.name:abc', filters: [] },
            },
          },
        ]) {
          const updateResponse = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdRule.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              name: 'bcd',
              tags: ['bar'],
              params: {
                foo: true,
              },
              schedule: { interval: '12s' },
              throttle: '1m',
              notify_when: 'onThrottleInterval',
              actions: [
                {
                  id: 'system-connector-test.system-action',
                  params: {},
                  ...propertyToAdd,
                },
              ],
            })
            .expect(200);

          expect(updateResponse.body.actions[0][Object.keys(propertyToAdd)[0]]).to.be(undefined);

          const esResponse = await es.get<SavedObject<RawRule>>(
            {
              index: ALERTING_CASES_SAVED_OBJECT_INDEX,
              id: `alert:${updateResponse.body.id}`,
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

        await supertestWithoutAuth
          .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdRule.id}`)
          .set('kbn-xsrf', 'foo')
          .auth(user.username, user.password)
          .send({
            name: 'bcd',
            tags: ['bar'],
            params: {
              foo: true,
            },
            schedule: { interval: '12s' },
            throttle: '1m',
            notify_when: 'onThrottleInterval',
            actions: [
              {
                id: 'system-connector-test.system-action',
                params: {},
              },
              {
                id: 'system-connector-test.system-action',
                params: {},
              },
            ],
          })
          .expect(400);
      });

      it('should not allow creating a default action without group', async () => {
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

        await supertestWithoutAuth
          .put(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdRule.id}`)
          .set('kbn-xsrf', 'foo')
          .auth(user.username, user.password)
          .send({
            name: 'bcd',
            tags: ['bar'],
            params: {
              foo: true,
            },
            schedule: { interval: '12s' },
            throttle: '1m',
            notify_when: 'onThrottleInterval',
            actions: [
              {
                // group is missing
                id: createdAction.id,
                params: {},
              },
            ],
          })
          .expect(400);
      });
    });
  });
}
