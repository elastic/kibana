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
export default function createUpdateTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('update', () => {
    let createdAlert: any;

    before(async () => {
      await esArchiver.load('actions/basic');
      await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200)
        .then((resp: any) => {
          createdAlert = resp.body;
        });
    });
    after(async () => {
      await supertest
        .delete(`/api/alert/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .expect(200);
      await esArchiver.unload('actions/basic');
    });

    it('should return 200 when updating an alert', async () => {
      await supertest
        .put(`/api/alert/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          alertTypeParams: {
            server: '4.3.2.1',
            threshold: 75,
          },
          interval: 12000,
          actions: [
            {
              group: 'default',
              id: ES_ARCHIVER_ACTION_ID,
              params: {
                message:
                  'UPDATED: The server {{context.server}} has a high CPU usage of {{state.lastCpuUsage}}% which is above the {{context.threshold}}% threshold',
              },
            },
          ],
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            id: createdAlert.id,
            alertTypeParams: {
              server: '4.3.2.1',
              threshold: 75,
            },
            interval: 12000,
            actions: [
              {
                group: 'default',
                id: ES_ARCHIVER_ACTION_ID,
                params: {
                  message:
                    'UPDATED: The server {{context.server}} has a high CPU usage of {{state.lastCpuUsage}}% which is above the {{context.threshold}}% threshold',
                },
              },
            ],
          });
        });
    });
  });
}
