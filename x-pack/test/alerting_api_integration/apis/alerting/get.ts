/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getTestAlertData } from './utils';
import { ES_ARCHIVER_ACTION_ID } from './constants';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('get', () => {
    let alertId: string;
    let space1AlertId: string;

    before(async () => {
      await esArchiver.load('actions/basic');
      await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200)
        .then((resp: any) => {
          alertId = resp.body.id;
        });
      await supertest
        .post('/s/space_1/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200)
        .then((resp: any) => {
          space1AlertId = resp.body.id;
        });
    });
    after(async () => {
      await supertest
        .delete(`/api/alert/${alertId}`)
        .set('kbn-xsrf', 'foo')
        .expect(204, '');
      await supertest
        .delete(`/s/space_1/api/alert/${space1AlertId}`)
        .set('kbn-xsrf', 'foo')
        .expect(204, '');
      await esArchiver.unload('actions/basic');
    });

    it('should return 200 when getting an alert', async () => {
      await supertest
        .get(`/api/alert/${alertId}`)
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            id: alertId,
            alertTypeId: 'test.noop',
            interval: '10s',
            enabled: true,
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
            alertTypeParams: {},
            scheduledTaskId: resp.body.scheduledTaskId,
          });
        });
    });

    it('should return 404 when gettin an alert in another space', async () => {
      await supertest.get(`/api/alert/${space1AlertId}`).expect(404);
    });

    it('should return 200 when getting an alert in a space', async () => {
      await supertest
        .get(`/s/space_1/api/alert/${space1AlertId}`)
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            id: space1AlertId,
            alertTypeId: 'test.noop',
            interval: '10s',
            enabled: true,
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
            alertTypeParams: {},
            scheduledTaskId: resp.body.scheduledTaskId,
          });
        });
    });
  });
}
