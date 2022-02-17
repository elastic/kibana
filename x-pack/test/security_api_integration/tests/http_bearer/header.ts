/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { adminTestUser } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const es = getService('es');

  async function createToken() {
    const { access_token: accessToken, authentication } = await es.security.getToken({
      body: {
        grant_type: 'password',
        ...adminTestUser,
      },
    });

    return {
      accessToken,
      expectedUser: {
        ...authentication,
        authentication_provider: { name: '__http__', type: 'http' },
        authentication_type: 'token',
      },
    };
  }

  describe('header', () => {
    it('accepts valid access token via authorization Bearer header', async () => {
      const { accessToken, expectedUser } = await createToken();

      const response = await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'true')
        .set('authorization', `Bearer ${accessToken}`)
        .expect(200, expectedUser);

      // Make sure we don't automatically create a session
      expect(response.headers['set-cookie']).to.be(undefined);
    });

    it('accepts multiple requests for a single valid access token', async () => {
      const { accessToken, expectedUser } = await createToken();

      // try it once
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'true')
        .set('authorization', `Bearer ${accessToken}`)
        .expect(200, expectedUser);

      // try it again to verity it isn't invalidated after a single request
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'true')
        .set('authorization', `Bearer ${accessToken}`)
        .expect(200, expectedUser);
    });

    it('rejects invalid access token via authorization Bearer header', async () => {
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'true')
        .set('authorization', 'Bearer notreal')
        .expect(401);
    });

    it('rejects invalidated access token via authorization Bearer header', async () => {
      const { accessToken } = await createToken();
      await es.security.invalidateToken({ body: { token: accessToken } });

      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'true')
        .set('authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('rejects expired access token via authorization Bearer header', async function () {
      this.timeout(40000);

      const { accessToken } = await createToken();

      // Access token expiration is set to 15s for API integration tests.
      // Let's wait for 20s to make sure token expires.
      await new Promise((resolve) => setTimeout(resolve, 20000));

      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'true')
        .set('authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });
}
