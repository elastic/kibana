/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
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

  describe('alerts', () => {
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

        it('should schedule task, run alert and schedule actions when appropriate', async () => {
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
              await alertUtils.disable(response.body.id);
              await taskManagerUtils.waitForIdle(testStart);

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
                  message: 'instanceContextValue: true, instanceStateValue: true',
                },
                reference,
                source: 'action:test.index-record',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle custom retry logic when appropriate', async () => {
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

        it('should have proper callCluster and savedObjectsClient authorization for alert type executor when appropriate', async () => {
          let searchResult: any;
          const testStart = new Date();
          const reference = alertUtils.generateReference();
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(
              getTestAlertData({
                alertTypeId: 'test.authorization',
                params: {
                  callClusterAuthorizationIndex: authorizationIndex,
                  savedObjectsClientType: 'dashboard',
                  savedObjectsClientId: '1',
                  index: ES_TEST_INDEX_NAME,
                  reference,
                },
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
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              objectRemover.add(space.id, response.body.id, 'alert');

              // Wait for test.authorization to index a document before disabling the alert and waiting for tasks to finish
              await esTestIndexTool.waitForDocs('alert:test.authorization', reference);
              await alertUtils.disable(response.body.id);
              await taskManagerUtils.waitForIdle(testStart);

              // Ensure only 1 document exists with proper params
              searchResult = await esTestIndexTool.search('alert:test.authorization', reference);
              expect(searchResult.hits.total.value).to.eql(1);
              expect(searchResult.hits.hits[0]._source.state).to.eql({
                callClusterSuccess: false,
                savedObjectsClientSuccess: false,
                callClusterError: {
                  ...searchResult.hits.hits[0]._source.state.callClusterError,
                  statusCode: 403,
                },
                savedObjectsClientError: {
                  ...searchResult.hits.hits[0]._source.state.savedObjectsClientError,
                  output: {
                    ...searchResult.hits.hits[0]._source.state.savedObjectsClientError.output,
                    statusCode: 403,
                  },
                },
              });
              break;
            case 'superuser at space1':
              expect(response.statusCode).to.eql(200);
              objectRemover.add(space.id, response.body.id, 'alert');

              // Wait for test.authorization to index a document before disabling the alert and waiting for tasks to finish
              await esTestIndexTool.waitForDocs('alert:test.authorization', reference);
              await alertUtils.disable(response.body.id);
              await taskManagerUtils.waitForIdle(testStart);

              // Ensure only 1 document exists with proper params
              searchResult = await esTestIndexTool.search('alert:test.authorization', reference);
              expect(searchResult.hits.total.value).to.eql(1);
              expect(searchResult.hits.hits[0]._source.state).to.eql({
                callClusterSuccess: true,
                savedObjectsClientSuccess: false,
                savedObjectsClientError: {
                  ...searchResult.hits.hits[0]._source.state.savedObjectsClientError,
                  output: {
                    ...searchResult.hits.hits[0]._source.state.savedObjectsClientError.output,
                    statusCode: 404,
                  },
                },
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should have proper callCluster and savedObjectsClient authorization for action type executor when appropriate', async () => {
          let searchResult: any;
          const testStart = new Date();
          const reference = alertUtils.generateReference();
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/action`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My action',
              actionTypeId: 'test.authorization',
            })
            .expect(200);
          objectRemover.add(space.id, createdAction.id, 'action');
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(
              getTestAlertData({
                alertTypeId: 'test.always-firing',
                params: {
                  index: ES_TEST_INDEX_NAME,
                  reference,
                },
                actions: [
                  {
                    group: 'default',
                    id: createdAction.id,
                    params: {
                      callClusterAuthorizationIndex: authorizationIndex,
                      savedObjectsClientType: 'dashboard',
                      savedObjectsClientId: '1',
                      index: ES_TEST_INDEX_NAME,
                      reference,
                    },
                  },
                ],
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
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              objectRemover.add(space.id, response.body.id, 'alert');

              // Ensure test.authorization indexed 1 document before disabling the alert and waiting for tasks to finish
              await esTestIndexTool.waitForDocs('action:test.authorization', reference);
              await alertUtils.disable(response.body.id);
              await taskManagerUtils.waitForIdle(testStart);

              // Ensure only 1 document with proper params exists
              searchResult = await esTestIndexTool.search('action:test.authorization', reference);
              expect(searchResult.hits.total.value).to.eql(1);
              expect(searchResult.hits.hits[0]._source.state).to.eql({
                callClusterSuccess: false,
                savedObjectsClientSuccess: false,
                callClusterError: {
                  ...searchResult.hits.hits[0]._source.state.callClusterError,
                  statusCode: 403,
                },
                savedObjectsClientError: {
                  ...searchResult.hits.hits[0]._source.state.savedObjectsClientError,
                  output: {
                    ...searchResult.hits.hits[0]._source.state.savedObjectsClientError.output,
                    statusCode: 403,
                  },
                },
              });
              break;
            case 'superuser at space1':
              expect(response.statusCode).to.eql(200);
              objectRemover.add(space.id, response.body.id, 'alert');

              // Ensure test.authorization indexed 1 document before disabling the alert and waiting for tasks to finish
              await esTestIndexTool.waitForDocs('action:test.authorization', reference);
              await alertUtils.disable(response.body.id);
              await taskManagerUtils.waitForIdle(testStart);

              // Ensure only 1 document with proper params exists
              searchResult = await esTestIndexTool.search('action:test.authorization', reference);
              expect(searchResult.hits.total.value).to.eql(1);
              expect(searchResult.hits.hits[0]._source.state).to.eql({
                callClusterSuccess: true,
                savedObjectsClientSuccess: false,
                savedObjectsClientError: {
                  ...searchResult.hits.hits[0]._source.state.savedObjectsClientError,
                  output: {
                    ...searchResult.hits.hits[0]._source.state.savedObjectsClientError.output,
                    statusCode: 404,
                  },
                },
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should throttle alerts when appropriate', async () => {
          const testStart = new Date();
          const reference = alertUtils.generateReference();
          const response = await alertUtils.createAlwaysFiringAction({
            reference,
            overwrites: {
              interval: '1s',
            },
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
            case 'space_1_all at space1':
            case 'superuser at space1':
              expect(response.statusCode).to.eql(200);
              // Wait until alerts scheduled actions 3 times before disabling the alert and waiting for tasks to finish
              await esTestIndexTool.waitForDocs('alert:test.always-firing', reference, 3);
              await alertUtils.disable(response.body.id);
              await taskManagerUtils.waitForIdle(testStart);

              // Ensure actions only executed once
              const searchResult = await esTestIndexTool.search(
                'action:test.index-record',
                reference
              );
              expect(searchResult.hits.total.value).to.eql(1);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should not throttle when changing groups', async () => {
          const testStart = new Date();
          const reference = alertUtils.generateReference();
          const response = await alertUtils.createAlwaysFiringAction({
            reference,
            overwrites: {
              interval: '1s',
              params: {
                index: ES_TEST_INDEX_NAME,
                reference,
                groupsToScheduleActionsInSeries: ['default', 'other'],
              },
              actions: [
                {
                  group: 'default',
                  id: indexRecordActionId,
                  params: {
                    index: ES_TEST_INDEX_NAME,
                    reference,
                    message: 'from:default',
                  },
                },
                {
                  group: 'other',
                  id: indexRecordActionId,
                  params: {
                    index: ES_TEST_INDEX_NAME,
                    reference,
                    message: 'from:other',
                  },
                },
              ],
            },
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
            case 'space_1_all at space1':
            case 'superuser at space1':
              expect(response.statusCode).to.eql(200);
              // Wait for actions to execute twice before disabling the alert and waiting for tasks to finish
              await esTestIndexTool.waitForDocs('action:test.index-record', reference, 2);
              await alertUtils.disable(response.body.id);
              await taskManagerUtils.waitForIdle(testStart);

              // Ensure only 2 actions with proper params exists
              const searchResult = await esTestIndexTool.search(
                'action:test.index-record',
                reference
              );
              expect(searchResult.hits.total.value).to.eql(2);
              const messages: string[] = searchResult.hits.hits.map(
                (hit: { _source: { params: { message: string } } }) => hit._source.params.message
              );
              expect(messages.sort()).to.eql(['from:default', 'from:other']);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should reset throttle window when not firing', async () => {
          const testStart = new Date();
          const reference = alertUtils.generateReference();
          const response = await alertUtils.createAlwaysFiringAction({
            reference,
            overwrites: {
              interval: '1s',
              params: {
                index: ES_TEST_INDEX_NAME,
                reference,
                groupsToScheduleActionsInSeries: ['default', null, 'default'],
              },
            },
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
            case 'space_1_all at space1':
            case 'superuser at space1':
              expect(response.statusCode).to.eql(200);
              // Actions should execute twice before widning things down
              await esTestIndexTool.waitForDocs('action:test.index-record', reference, 2);
              await alertUtils.disable(response.body.id);
              await taskManagerUtils.waitForIdle(testStart);

              // Ensure only 2 actions are executed
              const searchResult = await esTestIndexTool.search(
                'action:test.index-record',
                reference
              );
              expect(searchResult.hits.total.value).to.eql(2);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't schedule actions when alert is muted`, async () => {
          const testStart = new Date();
          const reference = alertUtils.generateReference();
          const response = await alertUtils.createAlwaysFiringAction({
            reference,
            overwrites: {
              enabled: false,
              interval: '1s',
            },
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
            case 'space_1_all at space1':
            case 'superuser at space1':
              await alertUtils.muteAll(response.body.id);
              await alertUtils.enable(response.body.id);

              // Wait until alerts schedule actions twice to ensure actions had a chance to skip
              // execution once before disabling the alert and waiting for tasks to finish
              await esTestIndexTool.waitForDocs('alert:test.always-firing', reference, 2);
              await alertUtils.disable(response.body.id);
              await taskManagerUtils.waitForIdle(testStart);

              // Should not have executed any action
              const executedActionsResult = await esTestIndexTool.search(
                'action:test.index-record',
                reference
              );
              expect(executedActionsResult.hits.total.value).to.eql(0);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't schedule actions when alert instance is muted`, async () => {
          const testStart = new Date();
          const reference = alertUtils.generateReference();
          const response = await alertUtils.createAlwaysFiringAction({
            reference,
            overwrites: {
              enabled: false,
              interval: '1s',
            },
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
            case 'space_1_all at space1':
            case 'superuser at space1':
              await alertUtils.muteInstance(response.body.id, '1');
              await alertUtils.enable(response.body.id);

              // Wait until alerts scheduled actions twice to ensure actions had a chance to execute
              // once before disabling the alert and waiting for tasks to finish
              await esTestIndexTool.waitForDocs('alert:test.always-firing', reference, 2);
              await alertUtils.disable(response.body.id);
              await taskManagerUtils.waitForIdle(testStart);

              // Should not have executed any action
              const executedActionsResult = await esTestIndexTool.search(
                'action:test.index-record',
                reference
              );
              expect(executedActionsResult.hits.total.value).to.eql(0);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`should unmute all instances when unmuting an alert`, async () => {
          const testStart = new Date();
          const reference = alertUtils.generateReference();
          const response = await alertUtils.createAlwaysFiringAction({
            reference,
            overwrites: {
              enabled: false,
              interval: '1s',
            },
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
            case 'space_1_all at space1':
            case 'superuser at space1':
              await alertUtils.muteInstance(response.body.id, '1');
              await alertUtils.muteAll(response.body.id);
              await alertUtils.unmuteAll(response.body.id);
              await alertUtils.enable(response.body.id);

              // Ensure actions are executed once before disabling the alert and waiting for tasks to finish
              await esTestIndexTool.waitForDocs('action:test.index-record', reference, 1);
              await alertUtils.disable(response.body.id);
              await taskManagerUtils.waitForIdle(testStart);

              // Should have one document indexed by the action
              const searchResult = await esTestIndexTool.search(
                'action:test.index-record',
                reference
              );
              expect(searchResult.hits.total.value).to.eql(1);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
