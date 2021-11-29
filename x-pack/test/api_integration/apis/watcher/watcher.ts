/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('watcher', () => {
    describe('POST /api/watcher/indices/index_patterns', () => {
      it('returns list of index patterns', async () => {
        const response = await supertest
          .get('/api/watcher/indices/index_patterns')
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        const expectedResponse = ['metrics-*', 'logs-*'];
        expect(response.body).to.eql(expectedResponse);
      });
    });
  });
}
