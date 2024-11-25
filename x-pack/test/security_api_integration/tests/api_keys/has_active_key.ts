/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const createKey = async () => {
    const { body: apiKey } = await supertest
      .post('/api_keys/_grant')
      .set('kbn-xsrf', 'xxx')
      .send({ name: 'an-actual-api-key' })
      .expect(200);
    expect(apiKey.name).to.eql('an-actual-api-key');
    return apiKey;
  };

  const cleanup = async () => {
    await getService('es').deleteByQuery({
      index: '.security-7',
      body: { query: { match: { doc_type: 'api_key' } } },
      refresh: true,
    });
  };

  describe('Has Active API Keys: _has_active', () => {
    before(cleanup);
    after(cleanup);

    it('detects when user has no API Keys', async () => {
      await supertest
        .get('/internal/security/api_key/_has_active')
        .set('kbn-xsrf', 'xxx')
        .expect(200, { hasApiKeys: false });
    });

    it('detects when user has some API Keys', async () => {
      await createKey();

      await supertest
        .get('/internal/security/api_key/_has_active')
        .set('kbn-xsrf', 'xxx')
        .expect(200, { hasApiKeys: true });
    });
  });
}
