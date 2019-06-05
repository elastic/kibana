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

  describe('create', () => {
    const createdAlertIds: string[] = [];

    before(() => esArchiver.load('actions/basic'));
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
            alertTypeId: 'cpu-check',
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
          expect(taskRecord.task.taskType).to.eql('alerting:cpu-check');
          expect(JSON.parse(taskRecord.task.params)).to.eql({
            alertId: resp.body.id,
          });
          const state = JSON.parse(taskRecord.task.state);
          expect(state).to.eql({
            alertTypeState: {
              lastCpuUsage: 100,
            },
            scheduledRunAt: state.scheduledRunAt,
            previousRange: {
              from: state.previousRange.from,
              to: state.previousRange.to,
            },
            alertInstances: {
              '1.2.3.4': {
                state: {
                  lastCpuUsage: 100,
                },
                meta: {
                  lastFired: state.alertInstances['1.2.3.4'].meta.lastFired,
                },
              },
            },
          });
        });
    });
  });
}
