/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ApiKey } from '@kbn/security-plugin/common/model';
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
    // get existing keys which would affect test results
    const { body: getResponseBody } = await supertest.get('/internal/security/api_key').expect(200);
    const apiKeys: ApiKey[] = getResponseBody.apiKeys;
    const existing = apiKeys.map(({ id, name }) => ({ id, name }));

    // invalidate the keys
    await supertest
      .post(`/internal/security/api_key/invalidate`)
      .set('kbn-xsrf', 'xxx')
      .send({ apiKeys: existing, isAdmin: false })
      .expect(200, { itemsInvalidated: existing, errors: [] });
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
