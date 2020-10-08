/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('elasticsearch client', () => {
    it('scopes the elasticsearch client provided via request context to user credentials', async () => {
      const { body } = await supertest
        .get('/api/elasticsearch_client_xpack/context/user')
        .expect(200);
      expect(body).not.to.be.empty();
    });
    it('scopes the elasticsearch client provided via request context to user credentials', async () => {
      const { body } = await supertest
        .get('/api/elasticsearch_client_xpack/contract/user')
        .expect(200);
      expect(body).not.to.be.empty();
    });
  });
}
