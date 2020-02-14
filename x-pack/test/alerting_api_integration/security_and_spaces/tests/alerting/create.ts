/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
import { checkAAD, getTestAlertData, getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('create', () => {
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
      describe(scenario.id, () => {
        it('should handle create alert request appropriately', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/action`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'MY action',
              actionTypeId: 'test.noop',
              config: {},
              secrets: {},
            })
            .expect(200);

          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(
              getTestAlertData({
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                ],
              })
            );

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              objectRemover.add(space.id, response.body.id, 'alert');
              expect(response.body).to.eql({
                id: response.body.id,
                name: 'abc',
                tags: ['foo'],
                actions: [
                  {
                    id: createdAction.id,
                    actionTypeId: createdAction.actionTypeId,
                    group: 'default',
                    params: {},
                  },
                ],
                enabled: true,
                alertTypeId: 'test.noop',
                consumer: 'bar',
                params: {},
                createdBy: user.username,
                schedule: { interval: '1m' },
                scheduledTaskId: response.body.scheduledTaskId,
                createdAt: response.body.createdAt,
                updatedAt: response.body.updatedAt,
                throttle: '1m',
                updatedBy: user.username,
                apiKeyOwner: user.username,
                muteAll: false,
                mutedInstanceIds: [],
              });
              expect(typeof response.body.scheduledTaskId).to.be('string');
              expect(Date.parse(response.body.createdAt)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updatedAt)).to.be.greaterThan(0);

              const { _source: taskRecord } = await getScheduledTask(response.body.scheduledTaskId);
              expect(taskRecord.type).to.eql('task');
              expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
              expect(JSON.parse(taskRecord.task.params)).to.eql({
                alertId: response.body.id,
                spaceId: space.id,
              });
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: 'alert',
                id: response.body.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle create alert request appropriately when an alert is disabled ', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(getTestAlertData({ enabled: false }));

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              objectRemover.add(space.id, response.body.id, 'alert');
              expect(response.body.scheduledTaskId).to.eql(undefined);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle create alert request appropriately when alert type is unregistered', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(
              getTestAlertData({
                alertTypeId: 'test.unregistered-alert-type',
              })
            );

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Alert type "test.unregistered-alert-type" is not registered.',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle create alert request appropriately when payload is empty and invalid', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({});

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
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

        it(`should handle create alert request appropriately when params isn't valid`, async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(
              getTestAlertData({
                alertTypeId: 'test.validation',
              })
            );

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
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

        it('should handle create alert request appropriately when interval schedule is wrong syntax', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(getTestAlertData(getTestAlertData({ schedule: { interval: '10x' } })));

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                error: 'Bad Request',
                message: '[request body.schedule.interval]: string is not a valid duration: 10x',
                statusCode: 400,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle create alert request appropriately when interval schedule is 0', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(getTestAlertData(getTestAlertData({ schedule: { interval: '0s' } })));

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                error: 'Bad Request',
                message: '[request body.schedule.interval]: string is not a valid duration: 0s',
                statusCode: 400,
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
