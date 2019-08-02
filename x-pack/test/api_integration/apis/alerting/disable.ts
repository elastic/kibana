/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTestAlertData } from './utils';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function createDisableAlertTests({
  getService,
}: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('disable', () => {
    let alertId: string;
    let space1AlertId: string;

    before(async () => {
      await esArchiver.load('actions/basic');
      await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData({ enabled: true }))
        .expect(200)
        .then((resp: any) => {
          alertId = resp.body.id;
        });
      await supertest
        .post('/s/space_1/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData({ enabled: true }))
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

    it('should return 204 when disabling an alert', async () => {
      await supertest
        .post(`/api/alert/${alertId}/_disable`)
        .set('kbn-xsrf', 'foo')
        .expect(204);
    });

    it('should return 404 when disabling an alert from another space', async () => {
      await supertest
        .post(`/api/alert/${space1AlertId}/_disable`)
        .set('kbn-xsrf', 'foo')
        .expect(404);
    });

    it('should return 204 when disabling an alert in a space', async () => {
      await supertest
        .post(`/s/space_1/api/alert/${space1AlertId}/_disable`)
        .set('kbn-xsrf', 'foo')
        .expect(204);
    });
  });
}
