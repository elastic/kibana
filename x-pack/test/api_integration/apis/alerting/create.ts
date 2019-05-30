/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ES_ARCHIVER_ACTION_ID } from './constants';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function createAlertTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

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

    it('should return 200 when creating an alert', async () => {
      await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send({
          alertTypeId: 'cpu-check',
          interval: 10 * 1000,
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
          alertTypeParams: {
            server: '1.2.3.4',
            threshold: 80,
          },
        })
        .expect(200)
        .then((resp: any) => {
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
        });
    });
  });
}
