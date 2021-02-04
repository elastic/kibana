/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import request, { Cookie } from 'request';
import { delay } from 'bluebird';
import { adminTestUser } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  getMutualAuthenticationResponseToken,
  getSPNEGOToken,
} from '../../fixtures/kerberos/kerberos_tools';

export default function ({ getService }: FtrProviderContext) {
  const spnegoToken = getSPNEGOToken();

  const supertest = getService('supertestWithoutAuth');
  const config = getService('config');

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

  describe('Kerberos authentication', () => {
    before(async () => {
      await getService('esSupertest')
        .post('/_security/role_mapping/krb5')
        .send({
          roles: ['kibana_admin'],
          enabled: true,
          rules: { field: { 'realm.name': 'kerb1' } },
        })
        .expect(200);
    });

    it('should reject API requests if client is not authenticated', async () => {
      await supertest.get('/internal/security/me').set('kbn-xsrf', 'xxx').expect(401);
    });

    it('does not prevent basic login', async () => {
      const response = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({
          providerType: 'basic',
          providerName: 'basic',
          currentURL: '/',
          params: { username: adminTestUser.username, password: adminTestUser.password },
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

      expect(user.username).to.eql(adminTestUser.username);
      expect(user.authentication_provider).to.eql({ type: 'basic', name: 'basic' });
      expect(user.authentication_type).to.eql('realm');
      // Do not assert on the `authentication_realm`, as the value differs for on-prem vs cloud
    });

    describe('initiating SPNEGO', () => {
      it('non-AJAX requests should properly initiate SPNEGO', async () => {
        const spnegoResponse = await supertest.get('/abc/xyz/spnego?one=two three').expect(401);

        expect(spnegoResponse.headers['set-cookie']).to.be(undefined);
        expect(spnegoResponse.headers['www-authenticate']).to.be('Negotiate');
      });

      it('AJAX requests should not initiate SPNEGO', async () => {
        const ajaxResponse = await supertest
          .get('/abc/xyz/spnego?one=two three')
          .set('kbn-xsrf', 'xxx')
          .expect(401);

        expect(ajaxResponse.headers['set-cookie']).to.be(undefined);
        expect(ajaxResponse.headers['www-authenticate']).to.be(undefined);
      });
    });

    describe('finishing SPNEGO', () => {
      it('should properly set cookie and authenticate user', async () => {
        const response = await supertest
          .get('/security/account')
          .set('Authorization', `Negotiate ${spnegoToken}`)
          .expect(200);

        // Verify that mutual authentication works.
        expect(response.headers['www-authenticate']).to.be(
          `Negotiate ${getMutualAuthenticationResponseToken()}`
        );

        const cookies = response.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const sessionCookie = request.cookie(cookies[0])!;
        checkCookieIsSet(sessionCookie);

        const isAnonymousAccessEnabled = (config.get(
          'esTestCluster.serverArgs'
        ) as string[]).some((setting) => setting.startsWith('xpack.security.authc.anonymous'));

        // `superuser_anonymous` role is derived from the enabled anonymous access.
        const expectedUserRoles = isAnonymousAccessEnabled
          ? ['kibana_admin', 'superuser_anonymous']
          : ['kibana_admin'];

        await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200, {
            username: 'tester@TEST.ELASTIC.CO',
            roles: expectedUserRoles,
            full_name: null,
            email: null,
            metadata: {
              kerberos_user_principal_name: 'tester@TEST.ELASTIC.CO',
              kerberos_realm: 'TEST.ELASTIC.CO',
            },
            enabled: true,
            authentication_realm: { name: 'kerb1', type: 'kerberos' },
            lookup_realm: { name: 'kerb1', type: 'kerberos' },
            authentication_provider: { type: 'kerberos', name: 'kerberos' },
            authentication_type: 'token',
          });
      });

      it('should re-initiate SPNEGO handshake if token is rejected with 401', async () => {
        const spnegoResponse = await supertest
          .get('/security/account')
          .set('Authorization', `Negotiate ${Buffer.from('Hello').toString('base64')}`)
          .expect(401);
        expect(spnegoResponse.headers['set-cookie']).to.be(undefined);
        expect(spnegoResponse.headers['www-authenticate']).to.be('Negotiate');
      });

      it('should fail if SPNEGO token is rejected because of unknown reason', async () => {
        const spnegoResponse = await supertest
          .get('/security/account')
          .set('Authorization', 'Negotiate (:I am malformed:)')
          .expect(500);
        expect(spnegoResponse.headers['set-cookie']).to.be(undefined);
        expect(spnegoResponse.headers['www-authenticate']).to.be(undefined);
      });
    });

    describe('API access with active session', () => {
      let sessionCookie: Cookie;

      beforeEach(async () => {
        const response = await supertest
          .get('/security/account')
          .set('Authorization', `Negotiate ${spnegoToken}`)
          .expect(200);

        const cookies = response.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        sessionCookie = request.cookie(cookies[0])!;
        checkCookieIsSet(sessionCookie);
      });

      it('should extend cookie on every successful non-system API call', async () => {
        const apiResponseOne = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(apiResponseOne.headers['set-cookie']).to.not.be(undefined);
        const sessionCookieOne = request.cookie(apiResponseOne.headers['set-cookie'][0])!;

        checkCookieIsSet(sessionCookieOne);
        expect(sessionCookieOne.value).to.not.equal(sessionCookie.value);

        const apiResponseTwo = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(apiResponseTwo.headers['set-cookie']).to.not.be(undefined);
        const sessionCookieTwo = request.cookie(apiResponseTwo.headers['set-cookie'][0])!;

        checkCookieIsSet(sessionCookieTwo);
        expect(sessionCookieTwo.value).to.not.equal(sessionCookieOne.value);
      });

      it('should not extend cookie for system API calls', async () => {
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
        const response = await supertest
          .get('/security/account')
          .set('Authorization', `Negotiate ${spnegoToken}`)
          .expect(200);

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

        expect(logoutResponse.headers.location).to.be('/security/logged_out?msg=LOGGED_OUT');

        // Token that was stored in the previous cookie should be invalidated as well and old
        // session cookie should not allow API access.
        const apiResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(401);

        // If Kibana detects cookie with invalid token it tries to clear it.
        cookies = apiResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);
        checkCookieIsCleared(request.cookie(cookies[0])!);

        // Request with a session cookie that is linked to an invalidated/non-existent session is treated the same as
        // request without any session cookie at all.
        expect(apiResponse.headers['www-authenticate']).to.be(undefined);
      });

      it('should redirect to home page if session cookie is not provided', async () => {
        const logoutResponse = await supertest.get('/api/security/logout').expect(302);

        expect(logoutResponse.headers['set-cookie']).to.be(undefined);
        expect(logoutResponse.headers.location).to.be('/');
      });
    });

    describe('API access with expired access token.', () => {
      let sessionCookie: Cookie;

      beforeEach(async () => {
        const response = await supertest
          .get('/security/account')
          .set('Authorization', `Negotiate ${spnegoToken}`)
          .expect(200);

        const cookies = response.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        sessionCookie = request.cookie(cookies[0])!;
        checkCookieIsSet(sessionCookie);
      });

      it('AJAX call should refresh token and update existing cookie', async function () {
        this.timeout(40000);

        // Access token expiration is set to 15s for API integration tests.
        // Let's wait for 20s to make sure token expires.
        await delay(20000);

        // This api call should succeed and automatically refresh token. Returned cookie will contain
        // the new access and refresh token pair.
        const apiResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        const cookies = apiResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const refreshedCookie = request.cookie(cookies[0])!;
        checkCookieIsSet(refreshedCookie);

        // The first new cookie with fresh pair of access and refresh tokens should work.
        await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', refreshedCookie.cookieString())
          .expect(200);

        expect(apiResponse.headers['www-authenticate']).to.be(undefined);
      });

      it('non-AJAX call should refresh token and update existing cookie', async function () {
        this.timeout(40000);

        // Access token expiration is set to 15s for API integration tests.
        // Let's wait for 20s to make sure token expires.
        await delay(20000);

        // This request should succeed and automatically refresh token. Returned cookie will contain
        // the new access and refresh token pair.
        const nonAjaxResponse = await supertest
          .get('/security/account')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        const cookies = nonAjaxResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const refreshedCookie = request.cookie(cookies[0])!;
        checkCookieIsSet(refreshedCookie);

        // The first new cookie with fresh pair of access and refresh tokens should work.
        await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', refreshedCookie.cookieString())
          .expect(200);

        expect(nonAjaxResponse.headers['www-authenticate']).to.be(undefined);
      });
    });

    describe('API access with missing access token document or expired refresh token.', () => {
      let sessionCookie: Cookie;

      beforeEach(async () => {
        const response = await supertest
          .get('/security/account')
          .set('Authorization', `Negotiate ${spnegoToken}`)
          .expect(200);

        const cookies = response.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        sessionCookie = request.cookie(cookies[0])!;
        checkCookieIsSet(sessionCookie);

        // Let's delete tokens from `.security-tokens` index directly to simulate the case when
        // Elasticsearch automatically removes access/refresh token document from the index after
        // some period of time.
        const esResponse = await getService('es').deleteByQuery({
          index: '.security-tokens',
          body: { query: { match: { doc_type: 'token' } } },
          refresh: true,
        });
        expect(esResponse.body).to.have.property('deleted').greaterThan(0);
      });

      it('AJAX call should initiate SPNEGO and clear existing cookie', async function () {
        const apiResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(401);

        const cookies = apiResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);
        checkCookieIsCleared(request.cookie(cookies[0])!);

        expect(apiResponse.headers['www-authenticate']).to.be('Negotiate');
      });

      it('non-AJAX call should initiate SPNEGO and clear existing cookie', async function () {
        const nonAjaxResponse = await supertest
          .get('/security/account')
          .set('Cookie', sessionCookie.cookieString())
          .expect(401);

        const cookies = nonAjaxResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);
        checkCookieIsCleared(request.cookie(cookies[0])!);

        expect(nonAjaxResponse.headers['www-authenticate']).to.be('Negotiate');
      });
    });
  });
}
