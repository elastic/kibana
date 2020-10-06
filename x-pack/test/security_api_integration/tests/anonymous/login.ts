/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import request, { Cookie } from 'request';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const config = getService('config');
  const security = getService('security');

  function checkCookieIsSet(cookie: Cookie) {
    expect(cookie.value).to.not.be.empty();

    expect(cookie.key).to.be('sid');
    expect(cookie.path).to.be('/');
    expect(cookie.httpOnly).to.be(true);
    expect(cookie.maxAge).to.be(null);
  }

  function checkCookieIsCleared(cookie: Cookie) {
    expect(cookie.value).to.be.empty();

    expect(cookie.key).to.be('sid');
    expect(cookie.path).to.be('/');
    expect(cookie.httpOnly).to.be(true);
    expect(cookie.maxAge).to.be(0);
  }

  describe('Anonymous authentication', () => {
    before(async () => {
      await security.user.create('anonymous_user', {
        password: 'changeme',
        roles: [],
        full_name: 'Guest',
      });
    });

    after(async () => {
      await security.user.delete('anonymous_user');
    });

    it('should reject API requests if client is not authenticated', async () => {
      await supertest.get('/internal/security/me').set('kbn-xsrf', 'xxx').expect(401);
    });

    it('does not prevent basic login', async () => {
      const [username, password] = config.get('servers.elasticsearch.auth').split(':');
      const response = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/',
          params: { username, password },
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).to.have.length(1);

      const cookie = request.cookie(cookies[0])!;
      checkCookieIsSet(cookie);

      const { body: user } = await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', cookie.cookieString())
        .expect(200);

      expect(user.username).to.eql(username);
      expect(user.authentication_provider).to.eql({ type: 'basic', name: 'basic1' });
      expect(user.authentication_type).to.eql('realm');
      // Do not assert on the `authentication_realm`, as the value differs for on-prem vs cloud
    });

    describe('login', () => {
      it('should properly set cookie and authenticate user', async () => {
        const response = await supertest.get('/security/account').expect(200);

        const cookies = response.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const sessionCookie = request.cookie(cookies[0])!;
        checkCookieIsSet(sessionCookie);

        const { body: user } = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(user.username).to.eql('anonymous_user');
        expect(user.authentication_provider).to.eql({ type: 'anonymous', name: 'anonymous1' });
        expect(user.authentication_type).to.eql('realm');
        // Do not assert on the `authentication_realm`, as the value differs for on-prem vs cloud
      });

      it('should fail if `Authorization` header is present, but not valid', async () => {
        const spnegoResponse = await supertest
          .get('/security/account')
          .set('Authorization', 'Basic wow')
          .expect(401);
        expect(spnegoResponse.headers['set-cookie']).to.be(undefined);
      });
    });

    describe('API access with active session', () => {
      let sessionCookie: Cookie;

      beforeEach(async () => {
        const response = await supertest.get('/security/account').expect(200);

        const cookies = response.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        sessionCookie = request.cookie(cookies[0])!;
        checkCookieIsSet(sessionCookie);
      });

      it('should not extend cookie for system AND non-system API calls', async () => {
        const apiResponseOne = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(apiResponseOne.headers['set-cookie']).to.be(undefined);

        const systemAPIResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('kbn-system-request', 'true')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(systemAPIResponse.headers['set-cookie']).to.be(undefined);
      });

      it('should fail and preserve session cookie if unsupported authentication schema is used', async () => {
        const apiResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Authorization', 'Basic a3JiNTprcmI1')
          .set('Cookie', sessionCookie.cookieString())
          .expect(401);

        expect(apiResponse.headers['set-cookie']).to.be(undefined);
      });
    });

    describe('logging out', () => {
      it('should redirect to `logged_out` page after successful logout', async () => {
        // First authenticate user to retrieve session cookie.
        const response = await supertest.get('/security/account').expect(200);
        let cookies = response.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const sessionCookie = request.cookie(cookies[0])!;
        checkCookieIsSet(sessionCookie);

        // And then log user out.
        const logoutResponse = await supertest
          .get('/api/security/logout')
          .set('Cookie', sessionCookie.cookieString())
          .expect(302);

        cookies = logoutResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);
        checkCookieIsCleared(request.cookie(cookies[0])!);

        expect(logoutResponse.headers.location).to.be('/security/logged_out');

        // Old cookie should be invalidated and not allow API access.
        const apiResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(401);

        // If Kibana detects cookie with invalid token it tries to clear it.
        cookies = apiResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);
        checkCookieIsCleared(request.cookie(cookies[0])!);
      });

      it('should redirect to home page if session cookie is not provided', async () => {
        const logoutResponse = await supertest.get('/api/security/logout').expect(302);

        expect(logoutResponse.headers['set-cookie']).to.be(undefined);
        expect(logoutResponse.headers.location).to.be('/');
      });
    });
  });
}
