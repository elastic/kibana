/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ getService }) {
  const supertest = getService('supertestWithoutAuth');
  const es = getService('es');

  async function createToken() {
    const { access_token: accessToken } = await es.shield.getAccessToken({
      body: {
        grant_type: 'password',
        username: 'elastic',
        password: 'changeme',
      }
    });

    return accessToken;
  }

  describe('header', () => {
    it('accepts valid access token via authorization Bearer header', async () => {
      const token = await createToken();

      await supertest
        .get('/api/security/v1/me')
        .set('kbn-xsrf', 'true')
        .set('authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('accepts multiple requests for a single valid access token', async () => {
      const token = await createToken();

      // try it once
      await supertest
        .get('/api/security/v1/me')
        .set('kbn-xsrf', 'true')
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      // try it again to verity it isn't invalidated after a single request
      await supertest
        .get('/api/security/v1/me')
        .set('kbn-xsrf', 'true')
        .set('authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
}
