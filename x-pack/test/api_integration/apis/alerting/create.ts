/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getTestAlertData } from './utils';
import { ES_ARCHIVER_ACTION_ID } from './constants';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function createAlertTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const retry = getService('retry');

  const esTestIndexName = '.kibaka-index-action-data';

  describe('create', () => {
    const createdAlertIds: string[] = [];

    before(async () => {
      await es.indices.create({
        index: esTestIndexName,
        body: {
          mappings: {
            properties: {
              reference: {
                type: 'keyword',
              },
              message: {
                type: 'text',
              },
            },
          },
        },
      });
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
      await es.indices.delete({ index: esTestIndexName });
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
                    'The server {{context.server}} has a high CPU usage of {{state.lastCpuUsage}}% which is above the {{context.threshold}}% threshold',
                },
              },
            ],
            alertTypeId: 'test-cpu-check',
            alertTypeParams: {
              server: '1.2.3.4',
              threshold: 80,
            },
            interval: 10000,
            scheduledTaskId: resp.body.scheduledTaskId,
          });
          expect(typeof resp.body.scheduledTaskId).to.be('string');
          const { _source: taskRecord } = await getScheduledTask(resp.body.scheduledTaskId);
          expect(taskRecord.type).to.eql('task');
          expect(taskRecord.task.taskType).to.eql('alerting:test-cpu-check');
          expect(JSON.parse(taskRecord.task.params)).to.eql({
            alertId: resp.body.id,
          });
          const state = JSON.parse(taskRecord.task.state);
          expect(state).to.eql({
            // Verify at least these attributes have values set
            alertTypeState: state.alertTypeState,
            scheduledRunAt: state.scheduledRunAt,
            previousRange: {
              from: state.previousRange.from,
              to: state.previousRange.to,
            },
            alertInstances: state.alertInstances,
          });
        });
    });

    it('should schedule task, run and fire actions', async () => {
      await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            interval: 100,
            actions: [
              {
                group: 'default',
                id: '2fe13e69-4561-420f-b61c-ce82a8a1a31f',
                params: {
                  index: esTestIndexName,
                  body: {
                    reference: 'create-test-1',
                    message:
                      'The server {{context.server}} has a high CPU usage of {{state.lastCpuUsage}}% which is above the {{context.threshold}}% threshold',
                  },
                },
              },
            ],
          })
        )
        .expect(200)
        .then((resp: any) => {
          createdAlertIds.push(resp.body.id);
        });
      const createdRecord = await retry.tryForTime(5000, async () => {
        const searchResult = await es.search({
          index: esTestIndexName,
          body: {
            query: {
              bool: {
                must: [
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
      expect(createdRecord._source).to.eql({
        reference: 'create-test-1',
        message: 'The server 1.2.3.4 has a high CPU usage of 100% which is above the 80% threshold',
      });
    });
  });
}
