/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../scenarios';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  AlertUtils,
  checkAAD,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getConsumerUnauthorizedErrorMessage,
  getProducerUnauthorizedErrorMessage,
  TaskManagerDoc,
} from '../../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function createDisableAlertTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  // Failing: See https://github.com/elastic/kibana/issues/141849
  describe.skip('disable', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    async function getScheduledTask(id: string): Promise<TaskManagerDoc> {
      const scheduledTask = await es.get<TaskManagerDoc>({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
      return scheduledTask._source!;
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
              getTestRuleData({
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
              // Ensure task still exists and is still enabled
              const taskRecord1 = await getScheduledTask(createdAlert.scheduled_task_id);
              expect(taskRecord1.type).to.eql('task');
              expect(taskRecord1.task.taskType).to.eql('alerting:test.noop');
              expect(JSON.parse(taskRecord1.task.params)).to.eql({
                alertId: createdAlert.id,
                spaceId: space.id,
                consumer: 'alertsFixture',
              });
              expect(taskRecord1.task.enabled).to.eql(true);
              break;
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');

              // task should still exist but be disabled
              await retry.try(async () => {
                const taskRecord2 = await getScheduledTask(createdAlert.scheduled_task_id);
                expect(taskRecord2.type).to.eql('task');
                expect(taskRecord2.task.taskType).to.eql('alerting:test.noop');
                expect(JSON.parse(taskRecord2.task.params)).to.eql({
                  alertId: createdAlert.id,
                  spaceId: space.id,
                  consumer: 'alertsFixture',
                });
                expect(taskRecord2.task.enabled).to.eql(false);
                // Ensure AAD isn't broken
                await checkAAD({
                  supertest,
                  spaceId: space.id,
                  type: 'alert',
                  id: createdAlert.id,
                });
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
              getTestRuleData({
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

              // task should still exist but be disabled
              const taskRecord = await getScheduledTask(createdAlert.scheduled_task_id);
              expect(taskRecord.type).to.eql('task');
              expect(taskRecord.task.taskType).to.eql('alerting:test.restricted-noop');
              expect(JSON.parse(taskRecord.task.params)).to.eql({
                alertId: createdAlert.id,
                spaceId: space.id,
                consumer: 'alertsRestrictedFixture',
              });
              expect(taskRecord.task.enabled).to.eql(false);
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
              getTestRuleData({
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
              // task should still exist but be disabled
              const taskRecord = await getScheduledTask(createdAlert.scheduled_task_id);
              expect(taskRecord.type).to.eql('task');
              expect(taskRecord.task.taskType).to.eql('alerting:test.unrestricted-noop');
              expect(JSON.parse(taskRecord.task.params)).to.eql({
                alertId: createdAlert.id,
                spaceId: space.id,
                consumer: 'alertsFixture',
              });
              expect(taskRecord.task.enabled).to.eql(false);
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
              getTestRuleData({
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
              // task should still exist but be disabled
              await retry.try(async () => {
                const taskRecord = await getScheduledTask(createdAlert.scheduled_task_id);
                expect(taskRecord.type).to.eql('task');
                expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
                expect(JSON.parse(taskRecord.task.params)).to.eql({
                  alertId: createdAlert.id,
                  spaceId: space.id,
                  consumer: 'alerts',
                });
                expect(taskRecord.task.enabled).to.eql(false);
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should still be able to disable alert when AAD is broken', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData({ enabled: true }))
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
              // Ensure task still exists and is still enabled
              const taskRecord1 = await getScheduledTask(createdAlert.scheduled_task_id);
              expect(taskRecord1.type).to.eql('task');
              expect(taskRecord1.task.taskType).to.eql('alerting:test.noop');
              expect(JSON.parse(taskRecord1.task.params)).to.eql({
                alertId: createdAlert.id,
                spaceId: space.id,
                consumer: 'alertsFixture',
              });
              expect(taskRecord1.task.enabled).to.eql(true);
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              // task should still exist but be disabled
              await retry.try(async () => {
                const taskRecord2 = await getScheduledTask(createdAlert.scheduled_task_id);
                expect(taskRecord2.type).to.eql('task');
                expect(taskRecord2.task.taskType).to.eql('alerting:test.noop');
                expect(JSON.parse(taskRecord2.task.params)).to.eql({
                  alertId: createdAlert.id,
                  spaceId: space.id,
                  consumer: 'alertsFixture',
                });
                expect(taskRecord2.task.enabled).to.eql(false);
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
            .send(getTestRuleData({ enabled: true }))
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
      });
    }
  });
}
