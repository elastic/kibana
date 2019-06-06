/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getTestAlertData, setupEsTestIndex, destroyEsTestIndex } from './utils';
import { ES_ARCHIVER_ACTION_ID } from './constants';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function createAlertTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const retry = getService('retry');

  describe('create', () => {
    let esTestIndexName: string;
    const createdAlertIds: string[] = [];

    before(async () => {
      ({ name: esTestIndexName } = await setupEsTestIndex(es));
      await esArchiver.load('actions/basic');
    });
    after(async () => {
      await Promise.all(
        createdAlertIds.map(id => {
          return supertest
            .delete(`/api/alert/${id}`)
            .set('kbn-xsrf', 'foo')
            .expect(200);
        })
      );
      await esArchiver.unload('actions/basic');
      await destroyEsTestIndex(es);
    });

    async function getScheduledTask(id: string) {
      return await es.get({
        id,
        index: '.kibana_task_manager',
      });
    }

    it('should return 200 when creating an alert', async () => {
      await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200)
        .then(async (resp: any) => {
          createdAlertIds.push(resp.body.id);
          expect(resp.body).to.eql({
            id: resp.body.id,
            actions: [
              {
                group: 'default',
                id: ES_ARCHIVER_ACTION_ID,
                params: {
                  message:
                    'instanceContextValue: {{context.instanceContextValue}}, instanceStateValue: {{state.instanceStateValue}}',
                },
              },
            ],
            alertTypeId: 'test.noop',
            alertTypeParams: {},
            interval: 10000,
            scheduledTaskId: resp.body.scheduledTaskId,
          });
          expect(typeof resp.body.scheduledTaskId).to.be('string');
          const { _source: taskRecord } = await getScheduledTask(resp.body.scheduledTaskId);
          expect(taskRecord.type).to.eql('task');
          expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
          expect(JSON.parse(taskRecord.task.params)).to.eql({
            alertId: resp.body.id,
          });
        });
    });

    it('should schedule task, run alert and fire actions', async () => {
      await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            interval: 100,
            alertTypeId: 'test.always-firing',
            alertTypeParams: {
              index: esTestIndexName,
              reference: 'create-test-1',
            },
            actions: [
              {
                group: 'default',
                id: '9597aa29-5d74-485b-af1d-4b7fdfd079e4',
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
          createdAlertIds.push(resp.body.id);
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
  });
}
