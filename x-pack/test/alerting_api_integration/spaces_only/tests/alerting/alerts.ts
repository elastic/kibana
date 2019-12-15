/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  ESTestIndexTool,
  ES_TEST_INDEX_NAME,
  getUrlPrefix,
  getTestAlertData,
  ObjectRemover,
  AlertUtils,
} from '../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function alertTests({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('legacyEs');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

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
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action`)
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
        space: Spaces.space1,
        supertestWithoutAuth,
        indexRecordActionId,
        objectRemover,
      });
    });
    afterEach(() => objectRemover.removeAll());
    after(async () => {
      await esTestIndexTool.destroy();
      await es.indices.delete({ index: authorizationIndex });
      objectRemover.add(Spaces.space1.id, indexRecordActionId, 'action');
      await objectRemover.removeAll();
    });

    it('should schedule task, run alert and schedule actions', async () => {
      const reference = alertUtils.generateReference();
      const response = await alertUtils.createAlwaysFiringAction({ reference });

      expect(response.statusCode).to.eql(200);
      const alertTestRecord = (
        await esTestIndexTool.waitForDocs('alert:test.always-firing', reference)
      )[0];
      expect(alertTestRecord._source).to.eql({
        source: 'alert:test.always-firing',
        reference,
        state: {},
        params: {
          index: ES_TEST_INDEX_NAME,
          reference,
        },
      });
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
          message: 'instanceContextValue: true, instanceStateValue: true',
        },
        reference,
        source: 'action:test.index-record',
      });
    });

    it('should handle custom retry logic', async () => {
      // We'll use this start time to query tasks created after this point
      const testStart = new Date();
      // We have to provide the test.rate-limit the next runAt, for testing purposes
      const retryDate = new Date(Date.now() + 60000);

      const { body: createdAction } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'Test rate limit',
          actionTypeId: 'test.rate-limit',
          config: {},
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action');

      const reference = alertUtils.generateReference();
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            interval: '1m',
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
      objectRemover.add(Spaces.space1.id, response.body.id, 'alert');
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
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alert`)
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
      objectRemover.add(Spaces.space1.id, response.body.id, 'alert');
      const alertTestRecord = (
        await esTestIndexTool.waitForDocs('alert:test.authorization', reference)
      )[0];
      expect(alertTestRecord._source.state).to.eql({
        callClusterSuccess: true,
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
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
          actionTypeId: 'test.authorization',
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action');
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alert`)
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
      objectRemover.add(Spaces.space1.id, response.body.id, 'alert');
      const actionTestRecord = (
        await esTestIndexTool.waitForDocs('action:test.authorization', reference)
      )[0];
      expect(actionTestRecord._source.state).to.eql({
        callClusterSuccess: true,
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
