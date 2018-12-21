/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import request from 'request';

export default function ({ getService }) {
  const supertest = getService('supertestWithoutAuth');

  function extractSessionCookie(response) {
    const cookie = (response.headers['set-cookie'] || []).find(header => header.startsWith('sid='));
    return cookie ? request.cookie(cookie) : undefined;
  }

  async function createSessionCookie() {
    const response = await supertest
      .post('/api/security/v1/login')
      .set('kbn-xsrf', 'true')
      .send({ username: 'elastic', password: 'changeme' });

    const cookie = extractSessionCookie(response);
    if (!cookie) {
      throw new Error('No session cookie set after login');
    }

    return cookie;
  }

  describe('session', () => {
    it('accepts valid session cookie', async () => {
      const cookie = await createSessionCookie();

      await supertest
        .get('/api/security/v1/me')
        .set('kbn-xsrf', 'true')
        .set('cookie', cookie.cookieString())
        .expect(200);
    });

    it('accepts multiple requests for a single valid session cookie', async () => {
      const cookie = await createSessionCookie();

      // try it once
      await supertest
        .get('/api/security/v1/me')
        .set('kbn-xsrf', 'true')
        .set('cookie', cookie.cookieString())
        .expect(200);

      // try it again to verity it isn't invalidated after a single request
      await supertest
        .get('/api/security/v1/me')
        .set('kbn-xsrf', 'true')
        .set('cookie', cookie.cookieString())
        .expect(200);
    });

    it('expired access token should be automatically refreshed', async function () {
      this.timeout(40000);

      const originalCookie = await createSessionCookie();

      // Access token expiration is set to 15s for API integration tests.
      // Let's wait for 20s to make sure token expires.
      await new Promise(resolve => setTimeout(() => resolve(), 20000));

      // This api call should succeed and automatically refresh token. Returned cookie will contain
      // the new access and refresh token pair.
      const response = await supertest
        .get('/api/security/v1/me')
        .set('kbn-xsrf', 'true')
        .set('cookie', originalCookie.cookieString())
        .expect(200);

      const newCookie = extractSessionCookie(response);
      if (!newCookie) {
        throw new Error('No session cookie set after token refresh');
      }
      if (!newCookie.httpOnly) {
        throw new Error('Session cookie is not marked as HttpOnly');
      }
      if (newCookie.value === originalCookie.value) {
        throw new Error('Session cookie has not changed after refresh');
      }

      // Request with old cookie should fail with `400` since it contains expired access token and
      // already used refresh tokens.
      const apiResponseWithExpiredToken = await supertest
        .get('/api/security/v1/me')
        .set('kbn-xsrf', 'true')
        .set('Cookie', originalCookie.cookieString())
        .expect(400);

      if (apiResponseWithExpiredToken.headers['set-cookie'] !== undefined) {
        throw new Error('Request rejecting expired access token still set session cookie');
      }

      // The new cookie with fresh pair of access and refresh tokens should work.
      await supertest
        .get('/api/security/v1/me')
        .set('kbn-xsrf', 'true')
        .set('Cookie', newCookie.cookieString())
        .expect(200);
    });
  });
}
