/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTestAlertData } from './utils';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function createEnableAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('enable', () => {
    let createdAlert: any;

    before(async () => {
      await esArchiver.load('actions/basic');
      await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData({ enabled: false }))
        .expect(200)
        .then((resp: any) => {
          createdAlert = resp.body;
        });
    });

    after(async () => {
      await supertest
        .delete(`/api/alert/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .expect(204, '');
      await esArchiver.unload('actions/basic');
    });

    it('should return 204 when enabling an alert', async () => {
      await supertest
        .post(`/api/alert/${createdAlert.id}/_enable`)
        .set('kbn-xsrf', 'foo')
        .expect(204);
    });
  });
}
