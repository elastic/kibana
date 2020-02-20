/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Response as SupertestResponse } from 'supertest';
import { UserAtSpaceScenarios } from '../../scenarios';
import {
  checkAAD,
  getUrlPrefix,
  getTestAlertData,
  ObjectRemover,
  ensureDatetimeIsWithinRange,
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
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'alert');

          const updatedData = {
            name: 'bcd',
            tags: ['bar'],
            params: {
              foo: true,
            },
            schedule: { interval: '12s' },
            actions: [],
            throttle: '1m',
          };
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alert/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(updatedData);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
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
              expect(response.body).to.eql({
                ...updatedData,
                id: createdAlert.id,
                alertTypeId: 'test.noop',
                consumer: 'bar',
                createdBy: 'elastic',
                enabled: true,
                updatedBy: user.username,
                apiKeyOwner: user.username,
                muteAll: false,
                mutedInstanceIds: [],
                scheduledTaskId: createdAlert.scheduledTaskId,
                createdAt: response.body.createdAt,
                updatedAt: response.body.updatedAt,
              });
              expect(Date.parse(response.body.createdAt)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updatedAt)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updatedAt)).to.be.greaterThan(
                Date.parse(response.body.createdAt)
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
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'alert');

          await supertest
            .put(`${getUrlPrefix(space.id)}/api/saved_objects/alert/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .send({
              attributes: {
                name: 'bar',
              },
            })
            .expect(200);

          const updatedData = {
            name: 'bcd',
            tags: ['bar'],
            params: {
              foo: true,
            },
            schedule: { interval: '12s' },
            actions: [],
            throttle: '1m',
          };
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alert/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(updatedData);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
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
              expect(response.body).to.eql({
                ...updatedData,
                id: createdAlert.id,
                alertTypeId: 'test.noop',
                consumer: 'bar',
                createdBy: 'elastic',
                enabled: true,
                updatedBy: user.username,
                apiKeyOwner: user.username,
                muteAll: false,
                mutedInstanceIds: [],
                scheduledTaskId: createdAlert.scheduledTaskId,
                createdAt: response.body.createdAt,
                updatedAt: response.body.updatedAt,
              });
              expect(Date.parse(response.body.createdAt)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updatedAt)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updatedAt)).to.be.greaterThan(
                Date.parse(response.body.createdAt)
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

        it(`shouldn't update alert from another space`, async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'alert');

          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix('other')}/api/alert/${createdAlert.id}`)
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
            });

          expect(response.statusCode).to.eql(404);
          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all at space1':
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
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
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'alert');

          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alert/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              name: 'bcd',
              tags: ['bar'],
              throttle: '1m',
              alertTypeId: '1',
              params: {
                foo: true,
              },
              schedule: { interval: '12s' },
              actions: [],
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
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
                message: '[request body.alertTypeId]: definition for this key is missing',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle update alert request appropriately when payload is empty and invalid', async () => {
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alert/1`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({});

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
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

        it(`should handle update alert request appropriately when alertTypeConfig isn't valid`, async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                alertTypeId: 'test.validation',
                params: {
                  param1: 'test',
                },
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'alert');

          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alert/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              name: 'bcd',
              tags: ['bar'],
              schedule: { interval: '1m' },
              throttle: '1m',
              params: {},
              actions: [],
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
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

        it('should handle update alert request appropriately when interval schedule is wrong syntax', async () => {
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alert/1`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(
              getTestAlertData({
                schedule: { interval: '10x' },
                enabled: undefined,
                consumer: undefined,
              })
            );

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
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
                message: '[request body.schedule.interval]: string is not a valid duration: 10x',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle updates to an alert schedule by rescheduling the underlying task', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                schedule: { interval: '30m' },
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'alert');

          await retry.try(async () => {
            const alertTask = (await getAlertingTaskById(createdAlert.scheduledTaskId)).docs[0];
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
          };
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/alert/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(updatedData);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
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
              await retry.try(async () => {
                const alertTask = (await getAlertingTaskById(createdAlert.scheduledTaskId)).docs[0];
                expect(alertTask.status).to.eql('idle');
                // ensure the alert is rescheduled to a minute from now
                ensureDatetimeIsWithinRange(Date.parse(alertTask.runAt), 60 * 1000);
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
