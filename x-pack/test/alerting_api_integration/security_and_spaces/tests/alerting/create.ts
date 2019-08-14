/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getTestAlertData } from './utils';
import { UserAtSpaceScenarios } from '../../scenarios';
import { getUrlPrefix } from '../../../common/lib/space_test_utils';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('create', () => {
    const createdObjects: Array<{ spaceId: string; id: string; type: string }> = [];

    after(async () => {
      await Promise.all(
        createdObjects.map(({ spaceId, id, type }) => {
          return supertest
            .delete(`${getUrlPrefix(spaceId)}/api/${type}/${id}`)
            .set('kbn-xsrf', 'foo')
            .expect(204);
        })
      );
    });

    async function getScheduledTask(id: string) {
      return await es.get({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
    }

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('create an alert', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(getTestAlertData());

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unable to create alert',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                id: response.body.id,
                actions: [],
                enabled: true,
                alertTypeId: 'test.noop',
                alertTypeParams: {},
                createdBy: user.username,
                interval: '10s',
                scheduledTaskId: response.body.scheduledTaskId,
              });
              expect(typeof response.body.scheduledTaskId).to.be('string');
              const { _source: taskRecord } = await getScheduledTask(response.body.scheduledTaskId);
              expect(taskRecord.type).to.eql('task');
              expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
              expect(JSON.parse(taskRecord.task.params)).to.eql({
                alertId: response.body.id,
                spaceId: space.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('disabled alert', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(getTestAlertData({ enabled: false }));

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unable to create alert',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.scheduledTaskId).to.eql(undefined);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('unregistered alert type', async () => {
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

        it('should return 400 when payload is empty and invalid', async () => {
          await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({})
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message:
                'child "alertTypeId" fails because ["alertTypeId" is required]. child "interval" fails because ["interval" is required]. child "alertTypeParams" fails because ["alertTypeParams" is required]. child "actions" fails because ["actions" is required]',
              validation: {
                source: 'payload',
                keys: ['alertTypeId', 'interval', 'alertTypeParams', 'actions'],
              },
            });
        });

        it(`should return 400 when alertTypeParams isn't valid`, async () => {
          await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(
              getTestAlertData({
                alertTypeId: 'test.validation',
              })
            )
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message:
                'alertTypeParams invalid: [param1]: expected value of type [string] but got [undefined]',
            });
        });

        it('should return 400 when interval is wrong syntax', async () => {
          await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(getTestAlertData(getTestAlertData({ interval: '10x' })))
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message:
                'child "interval" fails because ["interval" with value "10x" fails to match the seconds (5s) pattern, "interval" with value "10x" fails to match the minutes (5m) pattern, "interval" with value "10x" fails to match the hours (5h) pattern, "interval" with value "10x" fails to match the days (5d) pattern]',
              validation: {
                source: 'payload',
                keys: ['interval', 'interval', 'interval', 'interval'],
              },
            });
        });

        it('should return 400 when interval is 0', async () => {
          await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(getTestAlertData(getTestAlertData({ interval: '0s' })))
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message:
                'child "interval" fails because ["interval" with value "0s" fails to match the seconds (5s) pattern, "interval" with value "0s" fails to match the minutes (5m) pattern, "interval" with value "0s" fails to match the hours (5h) pattern, "interval" with value "0s" fails to match the days (5d) pattern]',
              validation: {
                source: 'payload',
                keys: ['interval', 'interval', 'interval', 'interval'],
              },
            });
        });
      });
    }
  });
}
