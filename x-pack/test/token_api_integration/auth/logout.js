/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import request from 'request';

export default function ({ getService }) {
  const supertest = getService('supertestWithoutAuth');

  function extractSessionCookie(response) {
    const cookie = (response.headers['set-cookie'] || []).find((header) =>
      header.startsWith('sid=')
    );
    return cookie ? request.cookie(cookie) : undefined;
  }

  async function createSessionCookie() {
    const response = await supertest
      .post('/internal/security/login')
      .set('kbn-xsrf', 'true')
      .send({
        providerType: 'token',
        providerName: 'token',
        currentURL: '/',
        params: { username: 'elastic', password: 'changeme' },
      });

    const cookie = extractSessionCookie(response);
    if (!cookie) {
      throw new Error('No session cookie set after login');
    }

    return cookie;
  }

  describe('logout', () => {
    it('redirects to login', async () => {
      const cookie = await createSessionCookie();

      await supertest
        .get('/api/security/logout')
        .set('cookie', cookie.cookieString())
        .expect(302)
        .expect('location', '/login?msg=LOGGED_OUT');
    });

    it('unsets the session cookie', async () => {
      const cookie = await createSessionCookie();

      const response = await supertest
        .get('/api/security/logout')
        .set('cookie', cookie.cookieString());

      const newCookie = extractSessionCookie(response);
      if (!newCookie) {
        throw new Error('Does not explicitly unset session cookie');
      }
      if (newCookie.value !== '') {
        throw new Error('Session cookie was not set to empty');
      }
    });

    it('invalidates the session cookie in case it is replayed', async () => {
      const cookie = await createSessionCookie();

      // destroy it
      await supertest.get('/api/security/logout').set('cookie', cookie.cookieString());

      // verify that the cookie no longer works
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'true')
        .set('cookie', cookie.cookieString())
        .expect(401);
    });
  });
}
