/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
import { getUrlPrefix, getTestAlertData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createUpdateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

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
            throttle: '2m',
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
                createdBy: 'elastic',
                enabled: true,
                updatedBy: user.username,
                apiKeyOwner: user.username,
                muteAll: false,
                mutedInstanceIds: [],
                scheduledTaskId: createdAlert.scheduledTaskId,
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
                message: '"alertTypeId" is not allowed',
                validation: {
                  source: 'payload',
                  keys: ['alertTypeId'],
                },
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
                message:
                  'child "throttle" fails because ["throttle" is required]. child "name" fails because ["name" is required]. child "tags" fails because ["tags" is required]. child "schedule" fails because ["schedule" is required]. child "params" fails because ["params" is required]. child "actions" fails because ["actions" is required]',
                validation: {
                  source: 'payload',
                  keys: ['throttle', 'name', 'tags', 'schedule', 'params', 'actions'],
                },
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
            .send(getTestAlertData({ schedule: { interval: '10x' }, enabled: undefined }));

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
                  'child "schedule" fails because [child "interval" fails because ["interval" with value "10x" fails to match the seconds pattern, "interval" with value "10x" fails to match the minutes pattern, "interval" with value "10x" fails to match the hours pattern, "interval" with value "10x" fails to match the days pattern]]. "alertTypeId" is not allowed',
                validation: {
                  source: 'payload',
                  keys: [
                    'schedule.interval',
                    'schedule.interval',
                    'schedule.interval',
                    'schedule.interval',
                    'alertTypeId',
                  ],
                },
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
