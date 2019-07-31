/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getTestAlertData, setupEsTestIndex, destroyEsTestIndex } from './utils';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { ES_ARCHIVER_ACTION_ID, SPACE_1_ES_ARCHIVER_ACTION_ID } from './constants';

// eslint-disable-next-line import/no-default-export
export default function alertTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const retry = getService('retry');

  describe('alerts', () => {
    let esTestIndexName: string;
    const createdAlertIds: Array<{ space: string; id: string }> = [];

    before(async () => {
      await destroyEsTestIndex(es);
      ({ name: esTestIndexName } = await setupEsTestIndex(es));
      await esArchiver.load('actions/basic');
    });
    after(async () => {
      await Promise.all(
        createdAlertIds.map(({ space, id }) => {
          const urlPrefix = space !== 'default' ? `/s/${space}` : '';
          return supertest
            .delete(`${urlPrefix}/api/alert/${id}`)
            .set('kbn-xsrf', 'foo')
            .expect(204, '');
        })
      );
      await esArchiver.unload('actions/basic');
      await destroyEsTestIndex(es);
    });

    it('should schedule task, run alert and fire actions', async () => {
      await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            interval: '1s',
            alertTypeId: 'test.always-firing',
            alertTypeParams: {
              index: esTestIndexName,
              reference: 'create-test-1',
            },
            actions: [
              {
                group: 'default',
                id: ES_ARCHIVER_ACTION_ID,
                params: {
                  index: esTestIndexName,
                  reference: 'create-test-1',
                  message:
                    'instanceContextValue: {{context.instanceContextValue}}, instanceStateValue: {{state.instanceStateValue}}',
                },
              },
            ],
          })
        )
        .expect(200)
        .then((resp: any) => {
          createdAlertIds.push({ space: 'default', id: resp.body.id });
        });
      const alertTestRecord = await retry.tryForTime(5000, async () => {
        const searchResult = await es.search({
          index: esTestIndexName,
          body: {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      source: 'alert:test.always-firing',
                    },
                  },
                  {
                    term: {
                      reference: 'create-test-1',
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
      expect(alertTestRecord._source).to.eql({
        source: 'alert:test.always-firing',
        reference: 'create-test-1',
        state: {},
        params: {
          index: esTestIndexName,
          reference: 'create-test-1',
        },
      });
      const actionTestRecord = await retry.tryForTime(5000, async () => {
        const searchResult = await es.search({
          index: esTestIndexName,
          body: {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      source: 'action:test.index-record',
                    },
                  },
                  {
                    term: {
                      reference: 'create-test-1',
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
      expect(actionTestRecord._source).to.eql({
        config: {
          encrypted: 'This value should be encrypted',
          unencrypted: `This value shouldn't get encrypted`,
        },
        params: {
          index: esTestIndexName,
          reference: 'create-test-1',
          message: 'instanceContextValue: true, instanceStateValue: true',
        },
        reference: 'create-test-1',
        source: 'action:test.index-record',
      });
    });

    it('should schedule task, run alert and fire actions in a space', async () => {
      const { body: createdAlert } = await supertest
        .post('/s/space_1/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            interval: '1s',
            alertTypeId: 'test.always-firing',
            alertTypeParams: {
              index: esTestIndexName,
              reference: 'create-test-2',
            },
            actions: [
              {
                group: 'default',
                id: SPACE_1_ES_ARCHIVER_ACTION_ID,
                params: {
                  index: esTestIndexName,
                  reference: 'create-test-2',
                  message:
                    'instanceContextValue: {{context.instanceContextValue}}, instanceStateValue: {{state.instanceStateValue}}',
                },
              },
            ],
          })
        )
        .expect(200);
      createdAlertIds.push({ space: 'space_1', id: createdAlert.id });

      const alertTestRecord = await retry.tryForTime(5000, async () => {
        const searchResult = await es.search({
          index: esTestIndexName,
          body: {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      source: 'alert:test.always-firing',
                    },
                  },
                  {
                    term: {
                      reference: 'create-test-2',
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
      expect(alertTestRecord._source).to.eql({
        source: 'alert:test.always-firing',
        reference: 'create-test-2',
        state: {},
        params: {
          index: esTestIndexName,
          reference: 'create-test-2',
        },
      });
      const actionTestRecord = await retry.tryForTime(5000, async () => {
        const searchResult = await es.search({
          index: esTestIndexName,
          body: {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      source: 'action:test.index-record',
                    },
                  },
                  {
                    term: {
                      reference: 'create-test-2',
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
      expect(actionTestRecord._source).to.eql({
        config: {
          encrypted: 'This value should be encrypted',
          unencrypted: `This value shouldn't get encrypted`,
        },
        params: {
          index: esTestIndexName,
          reference: 'create-test-2',
          message: 'instanceContextValue: true, instanceStateValue: true',
        },
        reference: 'create-test-2',
        source: 'action:test.index-record',
      });
    });

    it('should handle custom retry logic', async () => {
      // We'll use this start time to query tasks created after this point
      const testStart = new Date();
      // We have to provide the test.rate-limit the next runAt, for testing purposes
      const retryDate = new Date(Date.now() + 60000);

      const { body: createdAlert } = await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            interval: '1m',
            alertTypeId: 'test.always-firing',
            alertTypeParams: {
              index: esTestIndexName,
              reference: 'create-test-2',
            },
            actions: [
              {
                group: 'default',
                id: 'ce37997f-0fb6-460a-8baf-f81ac5d38348',
                params: {
                  index: esTestIndexName,
                  reference: 'create-test-1',
                  retryAt: retryDate.getTime(),
                },
              },
            ],
          })
        )
        .expect(200);
      createdAlertIds.push(createdAlert.id);

      const scheduledActionTask = await retry.tryForTime(15000, async () => {
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
  });
}
