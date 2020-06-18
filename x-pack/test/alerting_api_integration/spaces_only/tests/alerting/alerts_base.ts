/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Response as SupertestResponse } from 'supertest';
import { Space } from '../../../common/types';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  ESTestIndexTool,
  ES_TEST_INDEX_NAME,
  getUrlPrefix,
  getTestAlertData,
  ObjectRemover,
  AlertUtils,
  ensureDatetimeIsWithinRange,
  TaskManagerUtils,
} from '../../../common/lib';

// eslint-disable-next-line import/no-default-export
export function alertTests({ getService }: FtrProviderContext, space: Space) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('legacyEs');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const taskManagerUtils = new TaskManagerUtils(es, retry);

  function getAlertingTaskById(taskId: string) {
    return supertestWithoutAuth
      .get(`/api/alerting_tasks/${taskId}`)
      .expect(200)
      .then((response: SupertestResponse) => response.body);
  }

  describe('alerts', () => {
    let alertUtils: AlertUtils;
    let indexRecordActionId: string;
    const authorizationIndex = '.kibana-test-authorization';
    const objectRemover = new ObjectRemover(supertestWithoutAuth);

    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
      await es.indices.create({ index: authorizationIndex });
      const { body: createdAction } = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/api/actions/action`)
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
        space,
        supertestWithoutAuth,
        indexRecordActionId,
        objectRemover,
      });
    });
    afterEach(() => objectRemover.removeAll());
    after(async () => {
      await esTestIndexTool.destroy();
      await es.indices.delete({ index: authorizationIndex });
      objectRemover.add(space.id, indexRecordActionId, 'action', 'actions');
      await objectRemover.removeAll();
    });

    it('should schedule task, run alert and schedule actions', async () => {
      const testStart = new Date();
      const reference = alertUtils.generateReference();
      const response = await alertUtils.createAlwaysFiringAction({ reference });
      const alertId = response.body.id;

      expect(response.statusCode).to.eql(200);
      const alertTestRecord = (
        await esTestIndexTool.waitForDocs('alert:test.always-firing', reference)
      )[0];
      const expected = {
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
          namespace: space.namespace,
          name: 'abc',
          tags: ['tag-A', 'tag-B'],
          createdBy: null,
          updatedBy: null,
        },
      };
      if (expected.alertInfo.namespace === undefined) {
        delete expected.alertInfo.namespace;
      }
      expect(alertTestRecord._source).to.eql(expected);
      const actionTestRecord = (
        await esTestIndexTool.waitForDocs('action:test.index-record', reference)
      )[0];
      expect(actionTestRecord._source).to.eql({
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
    });

    it('should reschedule failing alerts using the alerting interval and not the Task Manager retry logic', async () => {
      /*
        Alerting does not use the Task Manager schedule and instead implements its own due to a current limitation
        in TaskManager's ability to update an existing Task.
        For this reason we need to handle the retry when Alert executors fail, as TaskManager doesn't understand that
        alerting tasks are recurring tasks.
      */
      const alertIntervalInSeconds = 30;
      const reference = alertUtils.generateReference();
      const response = await alertUtils.createAlwaysFailingAction({
        reference,
        overwrites: { schedule: { interval: `${alertIntervalInSeconds}s` } },
      });

      expect(response.statusCode).to.eql(200);

      // wait for executor Alert Executor to be run, which means the underlying task is running
      await esTestIndexTool.waitForDocs('alert:test.failing', reference);

      await retry.try(async () => {
        const alertTask = (await getAlertingTaskById(response.body.scheduledTaskId)).docs[0];
        expect(alertTask.status).to.eql('idle');
        // ensure the alert is rescheduled to a minute from now
        ensureDatetimeIsWithinRange(
          Date.parse(alertTask.runAt),
          alertIntervalInSeconds * 1000,
          5000
        );
      });
    });

    it('should handle custom retry logic', async () => {
      // We'll use this start time to query tasks created after this point
      const testStart = new Date();
      // We have to provide the test.rate-limit the next runAt, for testing purposes
      const retryDate = new Date(Date.now() + 60000);

      const { body: createdAction } = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/api/actions/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'Test rate limit',
          actionTypeId: 'test.rate-limit',
          config: {},
        })
        .expect(200);
      objectRemover.add(space.id, createdAction.id, 'action', 'actions');

      const reference = alertUtils.generateReference();
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            schedule: { interval: '1m' },
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

      expect(response.statusCode).to.eql(200);
      objectRemover.add(space.id, response.body.id, 'alert', 'alerts');
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
      expect(scheduledActionTask._source.task.runAt).to.eql(retryDate.toISOString());
    });

    it('should have proper callCluster and savedObjectsClient authorization for alert type executor', async () => {
      const reference = alertUtils.generateReference();
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
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

      expect(response.statusCode).to.eql(200);
      objectRemover.add(space.id, response.body.id, 'alert', 'alerts');
      const alertTestRecord = (
        await esTestIndexTool.waitForDocs('alert:test.authorization', reference)
      )[0];
      expect(alertTestRecord._source.state).to.eql({
        callClusterSuccess: true,
        callScopedClusterSuccess: true,
        savedObjectsClientSuccess: false,
        savedObjectsClientError: {
          ...alertTestRecord._source.state.savedObjectsClientError,
          output: {
            ...alertTestRecord._source.state.savedObjectsClientError.output,
            statusCode: 404,
          },
        },
      });
    });

    it('should have proper callCluster and savedObjectsClient authorization for action type executor', async () => {
      const reference = alertUtils.generateReference();
      const { body: createdAction } = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/api/actions/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
          actionTypeId: 'test.authorization',
        })
        .expect(200);
      objectRemover.add(space.id, createdAction.id, 'action', 'actions');
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
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

      expect(response.statusCode).to.eql(200);
      objectRemover.add(space.id, response.body.id, 'alert', 'alerts');
      const actionTestRecord = (
        await esTestIndexTool.waitForDocs('action:test.authorization', reference)
      )[0];
      expect(actionTestRecord._source.state).to.eql({
        callClusterSuccess: true,
        callScopedClusterSuccess: true,
        savedObjectsClientSuccess: false,
        savedObjectsClientError: {
          ...actionTestRecord._source.state.savedObjectsClientError,
          output: {
            ...actionTestRecord._source.state.savedObjectsClientError.output,
            statusCode: 404,
          },
        },
      });
    });
  });
}
