/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const es = getService('es');

  function extractSessionCookie(response: { headers: Record<string, string[]> }) {
    const cookie = (response.headers['set-cookie'] || []).find((header) =>
      header.startsWith('sid=')
    );
    return cookie ? parseCookie(cookie) : undefined;
  }

  async function createToken() {
    const {
      body: { access_token: accessToken },
    } = await es.security.getToken({
      body: {
        grant_type: 'password',
        username: 'elastic',
        password: 'changeme',
      },
    });

    return accessToken;
  }

  describe('login', () => {
    it('does not accept bearer credentials as 401 status', async () => {
      const token = await createToken();
      await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'true')
        .set('authorization', `Bearer ${token}`)
        .send({
          providerType: 'http',
          providerName: 'http',
          currentURL: '/',
        })
        .expect(401);
    });

    it('rejects without credentials as 400 status', async () => {
      const response = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'true')
        .expect(400);

      if (extractSessionCookie(response)) {
        throw new Error('Session cookie was set despite invalid login');
      }
    });

    it('rejects invalid credentials as 401 status', async () => {
      const response = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'true')
        .set('authorization', 'Bearer invalidtoken')
        .send({
          providerType: 'http',
          providerName: 'http',
          currentURL: '/',
        })
        .expect(401);

      if (extractSessionCookie(response)) {
        throw new Error('Session cookie was set despite invalid login');
      }
    });
  });
}
