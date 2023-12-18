/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ApiKey } from '@kbn/security-plugin/common/model';
import { adminTestUser } from '@kbn/test';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');

  const { username, password } = adminTestUser;
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');

  const createKey = async () => {
    const { body: apiKey } = await supertest
      .post('/api_keys/_grant')
      .set('Authorization', `Basic ${credentials}`)
      .set('kbn-xsrf', 'xxx')
      .send({ name: 'an-actual-api-key' })
      .expect(200);
    expect(apiKey.name).to.eql('an-actual-api-key');
    return apiKey;
  };

  const cleanup = async () => {
    // get existing keys which would affect test results
    const { body, status } = await supertest
      .get('/internal/security/api_key')
      .set('Authorization', `Basic ${credentials}`);
    expect(status).to.be(200);
    const apiKeys: ApiKey[] = body.apiKeys;
    const existing = apiKeys.map(({ id, name }) => ({ id, name }));

    // invalidate the keys
    const deleteResponse = await supertest
      .post(`/internal/security/api_key/invalidate`)
      .set('Authorization', `Basic ${credentials}`)
      .set('kbn-xsrf', 'xxx')
      .send({ apiKeys: existing, isAdmin: false });
    expect(deleteResponse.status).to.be(200);
    expect(deleteResponse.body).to.eql({
      itemsInvalidated: existing,
      errors: [],
    });
  };

  describe('Has Active API Keys: _has_active', () => {
    before(cleanup);
    after(cleanup);

    it('detects when user has no API Keys', async () => {
      const { body, status } = await supertest
        .get('/internal/security/api_key/_has_active')
        .set('Authorization', `Basic ${credentials}`)
        .set('kbn-xsrf', 'xxx');

      expect(status).to.be(200);
      expect(body).to.eql({ hasApiKeys: false });
    });

    it('detects when user has some API Keys', async () => {
      await createKey();

      const { body, status } = await supertest
        .get('/internal/security/api_key/_has_active')
        .set('Authorization', `Basic ${credentials}`)
        .set('kbn-xsrf', 'xxx');

      expect(status).to.be(200);
      expect(body).to.eql({ hasApiKeys: true });
    });
  });
}
