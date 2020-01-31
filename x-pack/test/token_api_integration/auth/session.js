/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import request from 'request';
import expect from '@kbn/expect';

const delay = ms => new Promise(resolve => setTimeout(() => resolve(), ms));

export default function({ getService }) {
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

    describe('API access with expired access token.', function() {
      const expectNewSessionCookie = (originalCookie, newCookie) => {
        if (!newCookie) {
          throw new Error('No session cookie set after token refresh');
        }
        if (!newCookie.httpOnly) {
          throw new Error('Session cookie is not marked as HttpOnly');
        }
        if (newCookie.value === originalCookie.value) {
          throw new Error('Session cookie has not changed after refresh');
        }
      };

      it('expired access token should be automatically refreshed', async function() {
        this.timeout(40000);

        const originalCookie = await createSessionCookie();

        // Access token expiration is set to 15s for API integration tests.
        // Let's wait for 20s to make sure token expires.
        await delay(20000);

        // This api call should succeed and automatically refresh token. Returned cookie will contain
        // the new access and refresh token pair.
        const firstResponse = await supertest
          .get('/api/security/v1/me')
          .set('kbn-xsrf', 'true')
          .set('cookie', originalCookie.cookieString())
          .expect(200);

        const firstNewCookie = extractSessionCookie(firstResponse);
        expectNewSessionCookie(originalCookie, firstNewCookie);

        // Request with old cookie should return another valid cookie we can use to authenticate requests
        // if it happens within 60 seconds of the refresh token being used
        const secondResponse = await supertest
          .get('/api/security/v1/me')
          .set('kbn-xsrf', 'true')
          .set('Cookie', originalCookie.cookieString())
          .expect(200);

        const secondNewCookie = extractSessionCookie(secondResponse);
        expectNewSessionCookie(originalCookie, secondNewCookie);

        if (secondNewCookie.value === firstNewCookie.value) {
          throw new Error('Second new cookie is the same as the first new cookie');
        }

        // The first new cookie should authenticate a subsequent request
        await supertest
          .get('/api/security/v1/me')
          .set('kbn-xsrf', 'true')
          .set('Cookie', firstNewCookie.cookieString())
          .expect(200);

        // The second new cookie should authenticate a subsequent request
        await supertest
          .get('/api/security/v1/me')
          .set('kbn-xsrf', 'true')
          .set('Cookie', secondNewCookie.cookieString())
          .expect(200);
      });
    });

    describe('API access with missing access token document.', () => {
      let sessionCookie;
      beforeEach(async () => (sessionCookie = await createSessionCookie()));

      it('should clear cookie and redirect to login', async function() {
        // Let's delete tokens from `.security` index directly to simulate the case when
        // Elasticsearch automatically removes access/refresh token document from the index
        // after some period of time.
        const esResponse = await getService('legacyEs').deleteByQuery({
          index: '.security-tokens',
          q: 'doc_type:token',
          refresh: true,
        });
        expect(esResponse)
          .to.have.property('deleted')
          .greaterThan(0);

        const response = await supertest
          .get('/abc/xyz/')
          .set('Cookie', sessionCookie.cookieString())
          .expect('location', '/login?next=%2Fabc%2Fxyz%2F')
          .expect(302);

        const cookies = response.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const cookie = request.cookie(cookies[0]);
        expect(cookie.key).to.be('sid');
        expect(cookie.value).to.be.empty();
        expect(cookie.path).to.be('/');
        expect(cookie.httpOnly).to.be(true);
      });
    });
  });
}
