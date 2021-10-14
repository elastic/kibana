/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  AlertUtils,
  checkAAD,
  getUrlPrefix,
  getTestAlertData,
  ObjectRemover,
  getConsumerUnauthorizedErrorMessage,
  getProducerUnauthorizedErrorMessage,
  getEventLog,
} from '../../../common/lib';
import { validateEvent } from '../../../spaces_only/tests/alerting/event_log';

// eslint-disable-next-line import/no-default-export
export default function createDisableAlertTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('disable', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    async function getScheduledTask(id: string) {
      return await es.get({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
    }

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      const alertUtils = new AlertUtils({ user, space, supertestWithoutAuth });

      describe(scenario.id, () => {
        it('should handle disable alert request appropriately', async () => {
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
            .send(
              getTestAlertData({
                enabled: true,
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                ],
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await alertUtils.getDisableRequest(createdAlert.id);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getConsumerUnauthorizedErrorMessage(
                  'disable',
                  'test.noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              // Ensure task still exists
              await getScheduledTask(createdAlert.scheduled_task_id);
              break;
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              try {
                await getScheduledTask(createdAlert.scheduled_task_id);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.meta.statusCode).to.eql(404);
              }
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

        it('should handle disable alert request appropriately when consumer is the same as producer', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                rule_type_id: 'test.restricted-noop',
                consumer: 'alertsRestrictedFixture',
                enabled: true,
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await alertUtils.getDisableRequest(createdAlert.id);

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
                  'disable',
                  'test.restricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              try {
                await getScheduledTask(createdAlert.scheduled_task_id);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.meta.statusCode).to.eql(404);
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle disable alert request appropriately when consumer is not the producer', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                rule_type_id: 'test.unrestricted-noop',
                consumer: 'alertsFixture',
                enabled: true,
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await alertUtils.getDisableRequest(createdAlert.id);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getConsumerUnauthorizedErrorMessage(
                  'disable',
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
                  'disable',
                  'test.unrestricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              try {
                await getScheduledTask(createdAlert.scheduled_task_id);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.meta.statusCode).to.eql(404);
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle disable alert request appropriately when consumer is "alerts"', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                rule_type_id: 'test.noop',
                consumer: 'alerts',
                enabled: true,
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await alertUtils.getDisableRequest(createdAlert.id);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getConsumerUnauthorizedErrorMessage('disable', 'test.noop', 'alerts'),
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getProducerUnauthorizedErrorMessage(
                  'disable',
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
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              try {
                await getScheduledTask(createdAlert.scheduled_task_id);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.meta.statusCode).to.eql(404);
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should still be able to disable alert when AAD is broken', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData({ enabled: true }))
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

          const response = await alertUtils.getDisableRequest(createdAlert.id);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getConsumerUnauthorizedErrorMessage(
                  'disable',
                  'test.noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              // Ensure task still exists
              await getScheduledTask(createdAlert.scheduled_task_id);
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              try {
                await getScheduledTask(createdAlert.scheduled_task_id);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.meta.statusCode).to.eql(404);
              }
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

        it(`shouldn't disable alert from another space`, async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix('other')}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData({ enabled: true }))
            .expect(200);
          objectRemover.add('other', createdAlert.id, 'rule', 'alerting');

          const response = await alertUtils.getDisableRequest(createdAlert.id);

          expect(response.statusCode).to.eql(404);
          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
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

        it('should create recovered-instance events for all alert instances', async () => {
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                rule_type_id: 'test.noop',
                consumer: 'alerts',
                enabled: true,
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

          const ruleId = createdRule.id;

          await alertUtils.getDisableRequest(ruleId);

          const events = await retry.try(async () => {
            // there can be a successful execute before the error one
            const someEvents = await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: ruleId,
              provider: 'alerting',
              actions: new Map([['recovered-instance', { equal: 2 }]]),
            });
            const errorEvents = someEvents.filter(
              (event) => event?.kibana?.alerting?.status === 'error'
            );
            if (errorEvents.length === 0) {
              throw new Error('no execute/error events yet');
            }
            return errorEvents;
          });

          const event = events[0];
          expect(event).to.be.ok();

          validateEvent(event, {
            spaceId: space.id,
            savedObjects: [{ type: 'alert', id: ruleId, rel: 'primary', type_id: 'test.noop' }],
            outcome: 'failure',
            message: `test.noop:${ruleId}: execution failed`,
            errorMessage: 'Unable to decrypt attribute "apiKey"',
            status: 'error',
            reason: 'decrypt',
            shouldHaveTask: true,
            rule: {
              id: ruleId,
              category: createdRule.body.rule_type_id,
              license: 'basic',
              ruleset: 'alertsFixture',
            },
          });
        });
      });
    }
  });
}
