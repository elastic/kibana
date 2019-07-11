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
export default function createFindTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('find', () => {
    let alertId: string;

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
    });
    after(async () => {
      await supertest
        .delete(`/api/alert/${alertId}`)
        .set('kbn-xsrf', 'foo')
        .expect(200);
      await esArchiver.unload('actions/basic');
    });

    it('should return 200 when finding alerts', async () => {
      await supertest
        .get('/api/alert/_find')
        .expect(200)
        .then((resp: any) => {
          const match = resp.body.find((obj: any) => obj.id === alertId);
          expect(match).to.eql({
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
            scheduledTaskId: match.scheduledTaskId,
          });
        });
    });
  });
}
