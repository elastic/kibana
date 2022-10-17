/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');

  describe('browser', () => {
    const apiPath = '/api/reporting/diagnose/browser';
    const username = 'elastic';
    const password = process.env.TEST_KIBANA_PASS || 'changeme';

    let body: any;
    let status: number;

    before(async () => {
      const response = await supertest
        .post(apiPath)
        .auth(username, password)
        .set('kbn-xsrf', 'xxx');
      ({ body, status } = response);
    });

    it('sends browser process logs', async () => {
      const logs = body.logs.join();
      expect(logs).to.contain(`DevTools listening on ws:`);
    });

    it('sends 200 status', async () => {
      expect(status).to.be(200);
    });
  });
}
