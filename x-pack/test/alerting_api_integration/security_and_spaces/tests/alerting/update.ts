/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Response as SupertestResponse } from 'supertest';
import { UserAtSpaceScenarios } from '../../scenarios';
import {
  checkAAD,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  ensureDatetimeIsWithinRange,
  getConsumerUnauthorizedErrorMessage,
  getProducerUnauthorizedErrorMessage,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createUpdateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');

  function getAlertingTaskById(taskId: string) {
    return supertest
      .get(`/api/alerting_tasks/${taskId}`)
      .expect(200)
      .then((response: SupertestResponse) => response.body);
  }

  describe('update', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
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
                message: getConsumerUnauthorizedErrorMessage(
                  'update',
                  'test.noop',
                  'alertsFixture'
                ),
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
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                ...updatedData,
                id: createdAlert.id,
                rule_type_id: 'test.noop',
                consumer: 'alertsFixture',
                created_by: 'elastic',
                enabled: true,
                updated_by: user.username,
                api_key_owner: user.username,
                mute_all: false,
                muted_alert_ids: [],
                actions: [
                  {
                    id: createdAction.id,
                    connector_type_id: 'test.noop',
                    group: 'default',
                    params: {},
                  },
                ],
                scheduled_task_id: createdAlert.scheduled_task_id,
                created_at: response.body.created_at,
                updated_at: response.body.updated_at,
                execution_status: response.body.execution_status,
              });
              expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(
                Date.parse(response.body.created_at)
              );
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: 'alert',
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
                message: getConsumerUnauthorizedErrorMessage(
                  'update',
                  'test.restricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                ...updatedData,
                id: createdAlert.id,
                rule_type_id: 'test.restricted-noop',
                consumer: 'alertsRestrictedFixture',
                created_by: 'elastic',
                enabled: true,
                updated_by: user.username,
                api_key_owner: user.username,
                mute_all: false,
                muted_alert_ids: [],
                scheduled_task_id: createdAlert.scheduled_task_id,
                created_at: response.body.created_at,
                updated_at: response.body.updated_at,
                execution_status: response.body.execution_status,
              });
              expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(
                Date.parse(response.body.created_at)
              );
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: 'alert',
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
                message: getConsumerUnauthorizedErrorMessage(
                  'update',
                  'test.unrestricted-noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getProducerUnauthorizedErrorMessage(
                  'update',
                  'test.unrestricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                ...updatedData,
                id: createdAlert.id,
                rule_type_id: 'test.unrestricted-noop',
                consumer: 'alertsFixture',
                created_by: 'elastic',
                enabled: true,
                updated_by: user.username,
                api_key_owner: user.username,
                mute_all: false,
                muted_alert_ids: [],
                scheduled_task_id: createdAlert.scheduled_task_id,
                created_at: response.body.created_at,
                updated_at: response.body.updated_at,
                execution_status: response.body.execution_status,
              });
              expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(
                Date.parse(response.body.created_at)
              );
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: 'alert',
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
                message: getConsumerUnauthorizedErrorMessage(
                  'update',
                  'test.restricted-noop',
                  'alerts'
                ),
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getProducerUnauthorizedErrorMessage(
                  'update',
                  'test.restricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                ...updatedData,
                id: createdAlert.id,
                rule_type_id: 'test.restricted-noop',
                consumer: 'alerts',
                created_by: 'elastic',
                enabled: true,
                updated_by: user.username,
                api_key_owner: user.username,
                mute_all: false,
                muted_alert_ids: [],
                scheduled_task_id: createdAlert.scheduled_task_id,
                created_at: response.body.created_at,
                updated_at: response.body.updated_at,
                execution_status: response.body.execution_status,
              });
              expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(
                Date.parse(response.body.created_at)
              );
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: 'alert',
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
                message: getConsumerUnauthorizedErrorMessage(
                  'update',
                  'test.noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                ...updatedData,
                id: createdAlert.id,
                rule_type_id: 'test.noop',
                consumer: 'alertsFixture',
                created_by: 'elastic',
                enabled: true,
                updated_by: user.username,
                api_key_owner: user.username,
                mute_all: false,
                muted_alert_ids: [],
                scheduled_task_id: createdAlert.scheduled_task_id,
                created_at: response.body.created_at,
                updated_at: response.body.updated_at,
                execution_status: response.body.execution_status,
              });
              expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(
                Date.parse(response.body.created_at)
              );
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: 'alert',
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
                message: getConsumerUnauthorizedErrorMessage(
                  'update',
                  'test.noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
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
                message: getConsumerUnauthorizedErrorMessage(
                  'update',
                  'test.validation',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
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
                message: getConsumerUnauthorizedErrorMessage(
                  'update',
                  'test.noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
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
          const { body: createdAlert } = await supertest
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
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');
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

          const statusUpdates: string[] = [];
          await retry.try(async () => {
            const alertTask = (await getAlertingTaskById(createdAlert.scheduled_task_id)).docs[0];
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
                message: getConsumerUnauthorizedErrorMessage(
                  'update',
                  'test.longRunning',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
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
                message: getConsumerUnauthorizedErrorMessage(
                  'update',
                  'test.noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
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
      });
    }
  });
}
