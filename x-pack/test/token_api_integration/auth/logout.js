/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import request from 'request';

export default function ({ getService }) {
  const supertest = getService('supertestWithoutAuth');

  function extractSessionCookie(response) {
    return (response.headers['set-cookie'] || []).find(header => header.startsWith('sid='));
  }

  async function createSessionCookie() {
    const response = await supertest
      .post('/api/security/v1/login')
      .set('kbn-xsrf', 'true')
      .send({ username: 'elastic', password: 'changeme' });

    const rawCookie = extractSessionCookie(response);
    if (!rawCookie) {
      throw new Error('No session cookie set after login');
    }

    const parsedCookie = request.cookie(rawCookie);
    return `${parsedCookie.key}=${parsedCookie.value}`;
  }

  describe('logout', () => {
    it('redirects to login', async () => {
      const cookie = await createSessionCookie();

      await supertest
        .get('/api/security/v1/logout')
        .set('cookie', cookie)
        .expect(302)
        .expect('location', '/login');
    });

    it('unsets the session cookie', async () => {
      const cookie = await createSessionCookie();

      const response = await supertest
        .get('/api/security/v1/logout')
        .set('cookie', cookie);

      const rawCookie = extractSessionCookie(response);
      if (!rawCookie) {
        throw new Error('Does not explicitly unset session cookie');
      }

      const parsedCookie = request.cookie(rawCookie);
      if (parsedCookie.value !== '') {
        throw new Error('Session cookie was not set to empty');
      }
    });

    it('invalidates the session cookie in case it is replayed', async () => {
      const cookie = await createSessionCookie();

      // destroy it
      await supertest
        .get('/api/security/v1/logout')
        .set('cookie', cookie);

      // verify that the cookie no longer works
      await supertest
        .get('/api/security/v1/me')
        .set('kbn-xsrf', 'true')
        .set('cookie', cookie)
        .expect(400);
    });
  });
}
