/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios, Superuser } from '../../scenarios';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  ESTestIndexTool,
  ES_TEST_INDEX_NAME,
  getUrlPrefix,
  getTestAlertData,
  ObjectRemover,
  AlertUtils,
  TaskManagerUtils,
} from '../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function alertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const taskManagerUtils = new TaskManagerUtils(es, retry);

  describe('invalidate_api_key', () => {
    const authorizationIndex = '.kibana-test-authorization';
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
      await es.indices.create({ index: authorizationIndex });
    });
    afterEach(() => objectRemover.removeAll());
    after(async () => {
      await esTestIndexTool.destroy();
      await es.indices.delete({ index: authorizationIndex });
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;

      describe(scenario.id, () => {
        let alertUtils: AlertUtils;
        let indexRecordActionId: string;

        before(async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/action`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My action',
              actionTypeId: 'test.index-record',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            })
            .expect(200);
          indexRecordActionId = createdAction.id;
          alertUtils = new AlertUtils({
            user,
            space,
            supertestWithoutAuth,
            indexRecordActionId,
            objectRemover,
          });
        });
        after(() => objectRemover.add(space.id, indexRecordActionId, 'action'));

        it('should complete successfully, when alert task is running while the API key is invalidated', async () => {
          const testStart = new Date();
          const reference = alertUtils.generateReference();
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(getTestAlertData({ alertTypeId: 'test.noop.long' }));

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

              const alertId = response.body.id;

              const alertTaskSearchResult = await esTestIndexTool.search(
                'alert:test.noop.long',
                reference
              );
              expect(alertTaskSearchResult.hits.total.value).to.eql(1);
              expect(alertTaskSearchResult.hits.hits[0]._source.task.status).to.eql('running');

              await alertUtils.updateApiKey(alertId);

              await taskManagerUtils.waitForAllTasksIdle(testStart);

              await alertUtils.disable(alertId);
              await taskManagerUtils.waitForEmpty(testStart);

              // Ensure only 1 alert executed with proper params
              const alertSearchResult = await esTestIndexTool.search(
                'alert:test.noop.long',
                reference
              );
              expect(alertSearchResult.hits.total.value).to.eql(1);
              expect(alertSearchResult.hits.hits[0]._source.source).to.eql('alert:test.noop.long');

              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should execute an action task which was scheduled before the API key is invalidated', async () => {
          const testStart = new Date();
          const reference = alertUtils.generateReference();
          const response = await alertUtils.createAlwaysFiringAction({ reference });

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

              // Wait for the action to index a document before disabling the alert and waiting for tasks to finish
              await esTestIndexTool.waitForDocs('action:test.index-record', reference);

              const alertId = response.body.id;

              await alertUtils.updateApiKey(alertId);

              await taskManagerUtils.waitForAllTasksIdle(testStart);

              await alertUtils.updateApiKey(alertId);

              await alertUtils.disable(alertId);
              await taskManagerUtils.waitForEmpty(testStart);

              // Ensure only 1 alert executed with proper params
              const alertSearchResult = await esTestIndexTool.search(
                'alert:test.always-firing',
                reference
              );
              expect(alertSearchResult.hits.total.value).to.eql(1);
              expect(alertSearchResult.hits.hits[0]._source).to.eql({
                source: 'alert:test.always-firing',
                reference,
                state: {},
                params: {
                  index: ES_TEST_INDEX_NAME,
                  reference,
                },
                alertInfo: {
                  alertId,
                  spaceId: space.id,
                  namespace: space.id,
                  name: 'abc',
                  tags: ['tag-A', 'tag-B'],
                  createdBy: user.fullName,
                  updatedBy: user.fullName,
                },
              });

              // Ensure only 1 action executed with proper params
              const actionSearchResult = await esTestIndexTool.search(
                'action:test.index-record',
                reference
              );
              expect(actionSearchResult.hits.total.value).to.eql(1);
              expect(actionSearchResult.hits.hits[0]._source).to.eql({
                config: {
                  unencrypted: `This value shouldn't get encrypted`,
                },
                secrets: {
                  encrypted: 'This value should be encrypted',
                },
                params: {
                  index: ES_TEST_INDEX_NAME,
                  reference,
                  message: `
alertId: ${alertId},
alertName: abc,
spaceId: ${space.id},
tags: tag-A,tag-B,
alertInstanceId: 1,
instanceContextValue: true,
instanceStateValue: true
`.trim(),
                },
                reference,
                source: 'action:test.index-record',
              });

              await taskManagerUtils.waitForActionTaskParamsToBeCleanedUp(testStart);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle if an action is in a retry state and depended on the API key', async () => {
          const testStart = new Date();
          // We have to provide the test.rate-limit the next runAt, for testing purposes
          const retryDate = new Date(Date.now() + 60000);

          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/action`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'Test rate limit',
              actionTypeId: 'test.rate-limit',
              config: {},
            })
            .expect(200);
          objectRemover.add(space.id, createdAction.id, 'action');

          const reference = alertUtils.generateReference();
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(
              getTestAlertData({
                alertTypeId: 'test.always-firing',
                params: {
                  index: ES_TEST_INDEX_NAME,
                  reference: 'create-test-2',
                },
                actions: [
                  {
                    group: 'default',
                    id: createdAction.id,
                    params: {
                      reference,
                      index: ES_TEST_INDEX_NAME,
                      retryAt: retryDate.getTime(),
                    },
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

              await alertUtils.updateApiKey(response.body.id);
              // Wait for the task to be attempted once and idle
              const scheduledActionTask = await retry.try(async () => {
                const searchResult = await es.search({
                  index: '.kibana_task_manager',
                  body: {
                    query: {
                      bool: {
                        must: [
                          {
                            term: {
                              'task.status': 'idle',
                            },
                          },
                          {
                            term: {
                              'task.attempts': 1,
                            },
                          },
                          {
                            term: {
                              'task.taskType': 'actions:test.rate-limit',
                            },
                          },
                          {
                            range: {
                              'task.scheduledAt': {
                                gte: testStart,
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                });
                expect(searchResult.hits.total.value).to.eql(1);
                return searchResult.hits.hits[0];
              });

              // Ensure the next runAt is set to the retryDate by custom logic
              expect(scheduledActionTask._source.task.runAt).to.eql(retryDate.toISOString());
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
