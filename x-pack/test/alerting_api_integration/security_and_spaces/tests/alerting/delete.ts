/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
import {
  getUrlPrefix,
  getTestAlertData,
  getConsumerUnauthorizedErrorMessage,
  getProducerUnauthorizedErrorMessage,
  ObjectRemover,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createDeleteTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('delete', () => {
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
        it('should handle delete alert request appropriately', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerts/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData())
            .expect(200);

          const response = await supertestWithoutAuth
            .delete(`${getUrlPrefix(space.id)}/api/alerts/alert/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getConsumerUnauthorizedErrorMessage(
                  'delete',
                  'test.noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              objectRemover.add(space.id, createdAlert.id, 'alert', 'alerts');
              // Ensure task still exists
              await getScheduledTask(createdAlert.scheduledTaskId);
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              try {
                await getScheduledTask(createdAlert.scheduledTaskId);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.status).to.eql(404);
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle delete alert request appropriately when consumer is the same as producer', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerts/alert`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                alertTypeId: 'test.restricted-noop',
                consumer: 'alertsRestrictedFixture',
              })
            )
            .expect(200);

          const response = await supertestWithoutAuth
            .delete(`${getUrlPrefix(space.id)}/api/alerts/alert/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password);

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
                  'delete',
                  'test.restricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              objectRemover.add(space.id, createdAlert.id, 'alert', 'alerts');
              // Ensure task still exists
              await getScheduledTask(createdAlert.scheduledTaskId);
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              try {
                await getScheduledTask(createdAlert.scheduledTaskId);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.status).to.eql(404);
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle delete alert request appropriately when consumer is not the producer', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerts/alert`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({ alertTypeId: 'test.unrestricted-noop', consumer: 'alertsFixture' })
            )
            .expect(200);

          const response = await supertestWithoutAuth
            .delete(`${getUrlPrefix(space.id)}/api/alerts/alert/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getConsumerUnauthorizedErrorMessage(
                  'delete',
                  'test.unrestricted-noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              objectRemover.add(space.id, createdAlert.id, 'alert', 'alerts');
              // Ensure task still exists
              await getScheduledTask(createdAlert.scheduledTaskId);
              break;
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getProducerUnauthorizedErrorMessage(
                  'delete',
                  'test.unrestricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              objectRemover.add(space.id, createdAlert.id, 'alert', 'alerts');
              // Ensure task still exists
              await getScheduledTask(createdAlert.scheduledTaskId);
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              try {
                await getScheduledTask(createdAlert.scheduledTaskId);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.status).to.eql(404);
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle delete alert request appropriately when consumer is "alerts"', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerts/alert`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                alertTypeId: 'test.noop',
                consumer: 'alerts',
              })
            )
            .expect(200);

          const response = await supertestWithoutAuth
            .delete(`${getUrlPrefix(space.id)}/api/alerts/alert/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getConsumerUnauthorizedErrorMessage('delete', 'test.noop', 'alerts'),
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getProducerUnauthorizedErrorMessage(
                  'delete',
                  'test.noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              objectRemover.add(space.id, createdAlert.id, 'alert', 'alerts');
              // Ensure task still exists
              await getScheduledTask(createdAlert.scheduledTaskId);
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              try {
                await getScheduledTask(createdAlert.scheduledTaskId);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.status).to.eql(404);
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't delete alert from another space`, async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerts/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'alert', 'alerts');

          const response = await supertestWithoutAuth
            .delete(`${getUrlPrefix('other')}/api/alerts/alert/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password);

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

        it('should still be able to delete alert when AAD is broken', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerts/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData())
            .expect(200);

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

          const response = await supertestWithoutAuth
            .delete(`${getUrlPrefix(space.id)}/api/alerts/alert/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getConsumerUnauthorizedErrorMessage(
                  'delete',
                  'test.noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              objectRemover.add(space.id, createdAlert.id, 'alert', 'alerts');
              // Ensure task still exists
              await getScheduledTask(createdAlert.scheduledTaskId);
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              try {
                await getScheduledTask(createdAlert.scheduledTaskId);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.status).to.eql(404);
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
