/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse as parseCookie, Cookie } from 'tough-cookie';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { adminTestUser } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';

const CA_CERT = readFileSync(CA_CERT_PATH);
const FIRST_CLIENT_CERT = readFileSync(resolve(__dirname, '../../fixtures/pki/first_client.p12'));
const SECOND_CLIENT_CERT = readFileSync(resolve(__dirname, '../../fixtures/pki/second_client.p12'));
const UNTRUSTED_CLIENT_CERT = readFileSync(
  resolve(__dirname, '../../fixtures/pki/untrusted_client.p12')
);

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');

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

  describe('PKI authentication', () => {
    before(async () => {
      await getService('esSupertest')
        .post('/_security/role_mapping/first_client_pki')
        .ca(CA_CERT)
        .send({
          roles: ['kibana_admin'],
          enabled: true,
          rules: { field: { dn: 'CN=first_client' } },
        })
        .expect(200);
    });

    it('should reject API requests that use untrusted certificate', async () => {
      await supertest
        .get('/internal/security/me')
        .ca(CA_CERT)
        .pfx(UNTRUSTED_CLIENT_CERT)
        .set('kbn-xsrf', 'xxx')
        .expect(401, { statusCode: 401, error: 'Unauthorized', message: 'Unauthorized' });
    });

    it('should fail and redirect if untrusted certificate is used', async () => {
      // Unlike the call to '/internal/security/me' above, this route can be redirected (see pre-response in `AuthenticationService`).
      const unauthenticatedResponse = await supertest
        .get('/security/account')
        .ca(CA_CERT)
        .pfx(UNTRUSTED_CLIENT_CERT)
        .expect(401);

      expect(unauthenticatedResponse.headers['content-security-policy']).to.be(
        `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`
      );
      expect(unauthenticatedResponse.text).to.contain('We couldn&#x27;t log you in');
    });

    it('does not prevent basic login', async () => {
      const response = await supertest
        .post('/internal/security/login')
        .ca(CA_CERT)
        .pfx(UNTRUSTED_CLIENT_CERT)
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

      const cookie = parseCookie(cookies[0])!;
      checkCookieIsSet(cookie);

      const { body: user } = await supertest
        .get('/internal/security/me')
        .ca(CA_CERT)
        .pfx(UNTRUSTED_CLIENT_CERT)
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', cookie.cookieString())
        .expect(200);

      expect(user.username).to.eql(adminTestUser.username);
      expect(user.authentication_provider).to.eql({ type: 'basic', name: 'basic' });
      // Do not assert on the `authentication_realm`, as the value differs for on-prem vs cloud
    });

    it('AJAX requests should not create a new session', async () => {
      const ajaxResponse = await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .ca(CA_CERT)
        .pfx(FIRST_CLIENT_CERT)
        .expect(401);

      expect(ajaxResponse.headers['set-cookie']).to.be(undefined);
    });

    it('should properly set cookie and authenticate user', async () => {
      const response = await supertest
        .get('/security/account')
        .ca(CA_CERT)
        .pfx(FIRST_CLIENT_CERT)
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).to.have.length(1);

      const sessionCookie = parseCookie(cookies[0])!;
      checkCookieIsSet(sessionCookie);

      // Cookie should be accepted.
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .ca(CA_CERT)
        .pfx(FIRST_CLIENT_CERT)
        .set('Cookie', sessionCookie.cookieString())
        .expect(200, {
          username: 'first_client',
          roles: ['kibana_admin'],
          full_name: null,
          email: null,
          enabled: true,
          metadata: {
            pki_delegated_by_realm: 'reserved',
            pki_delegated_by_user: 'kibana_system',
            pki_dn: 'CN=first_client',
          },
          authentication_realm: { name: 'pki1', type: 'pki' },
          lookup_realm: { name: 'pki1', type: 'pki' },
          authentication_provider: { name: 'pki', type: 'pki' },
          authentication_type: 'token',
        });
    });

    it('should update session if new certificate is provided', async () => {
      let response = await supertest
        .get('/security/account')
        .ca(CA_CERT)
        .pfx(FIRST_CLIENT_CERT)
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).to.have.length(1);

      const sessionCookie = parseCookie(cookies[0])!;
      checkCookieIsSet(sessionCookie);

      response = await supertest
        .get('/internal/security/me')
        .ca(CA_CERT)
        .pfx(SECOND_CLIENT_CERT)
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .expect(200, {
          username: 'second_client',
          roles: [],
          full_name: null,
          email: null,
          enabled: true,
          metadata: {
            pki_delegated_by_realm: 'reserved',
            pki_delegated_by_user: 'kibana_system',
            pki_dn: 'CN=second_client',
          },
          authentication_realm: { name: 'pki1', type: 'pki' },
          lookup_realm: { name: 'pki1', type: 'pki' },
          authentication_provider: { name: 'pki', type: 'pki' },
          authentication_type: 'realm',
        });

      checkCookieIsSet(parseCookie(response.headers['set-cookie'][0])!);
    });

    it('should reject valid cookie if used with untrusted certificate', async () => {
      const response = await supertest
        .get('/security/account')
        .ca(CA_CERT)
        .pfx(FIRST_CLIENT_CERT)
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).to.have.length(1);

      const sessionCookie = parseCookie(cookies[0])!;
      checkCookieIsSet(sessionCookie);

      await supertest
        .get('/internal/security/me')
        .ca(CA_CERT)
        .pfx(UNTRUSTED_CLIENT_CERT)
        .set('Cookie', sessionCookie.cookieString())
        .expect(401);
    });

    describe('API access with active session', () => {
      let sessionCookie: Cookie;

      beforeEach(async () => {
        const response = await supertest
          .get('/security/account')
          .ca(CA_CERT)
          .pfx(FIRST_CLIENT_CERT)
          .expect(200);

        const cookies = response.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        sessionCookie = parseCookie(cookies[0])!;
        checkCookieIsSet(sessionCookie);
      });

      it('should extend cookie on every successful non-system API call', async () => {
        const apiResponseOne = await supertest
          .get('/internal/security/me')
          .ca(CA_CERT)
          .pfx(FIRST_CLIENT_CERT)
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(apiResponseOne.headers['set-cookie']).to.not.be(undefined);
        const sessionCookieOne = parseCookie(apiResponseOne.headers['set-cookie'][0])!;

        checkCookieIsSet(sessionCookieOne);
        expect(sessionCookieOne.value).to.not.equal(sessionCookie.value);

        const apiResponseTwo = await supertest
          .get('/internal/security/me')
          .ca(CA_CERT)
          .pfx(FIRST_CLIENT_CERT)
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(apiResponseTwo.headers['set-cookie']).to.not.be(undefined);
        const sessionCookieTwo = parseCookie(apiResponseTwo.headers['set-cookie'][0])!;

        checkCookieIsSet(sessionCookieTwo);
        expect(sessionCookieTwo.value).to.not.equal(sessionCookieOne.value);
      });

      it('should not extend cookie for system API calls', async () => {
        const systemAPIResponse = await supertest
          .get('/internal/security/me')
          .ca(CA_CERT)
          .pfx(FIRST_CLIENT_CERT)
          .set('kbn-xsrf', 'xxx')
          .set('kbn-system-request', 'true')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(systemAPIResponse.headers['set-cookie']).to.be(undefined);
      });

      it('should fail and preserve session cookie if unsupported authentication schema is used', async () => {
        const apiResponse = await supertest
          .get('/internal/security/me')
          .ca(CA_CERT)
          .pfx(FIRST_CLIENT_CERT)
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
          .ca(CA_CERT)
          .pfx(FIRST_CLIENT_CERT)
          .expect(200);

        let cookies = response.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const sessionCookie = parseCookie(cookies[0])!;
        checkCookieIsSet(sessionCookie);

        // And then log user out.
        const logoutResponse = await supertest
          .get('/api/security/logout')
          .ca(CA_CERT)
          .pfx(FIRST_CLIENT_CERT)
          .set('Cookie', sessionCookie.cookieString())
          .expect(302);

        cookies = logoutResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);
        checkCookieIsCleared(parseCookie(cookies[0])!);

        expect(logoutResponse.headers.location).to.be('/security/logged_out?msg=LOGGED_OUT');
      });

      it('should redirect to home page if session cookie is not provided', async () => {
        const logoutResponse = await supertest
          .get('/api/security/logout')
          .ca(CA_CERT)
          .pfx(FIRST_CLIENT_CERT)
          .expect(302);

        expect(logoutResponse.headers['set-cookie']).to.be(undefined);
        expect(logoutResponse.headers.location).to.be('/security/logged_out?msg=LOGGED_OUT');
      });
    });

    describe('API access with expired access token.', () => {
      let sessionCookie: Cookie;

      beforeEach(async () => {
        const response = await supertest
          .get('/security/account')
          .ca(CA_CERT)
          .pfx(FIRST_CLIENT_CERT)
          .expect(200);

        const cookies = response.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        sessionCookie = parseCookie(cookies[0])!;
        checkCookieIsSet(sessionCookie);
      });

      it('AJAX call should re-acquire token and update existing cookie', async function () {
        this.timeout(40000);

        // Access token expiration is set to 15s for API integration tests.
        // Let's wait for 20s to make sure token expires.
        await setTimeoutAsync(20000);

        // This api call should succeed and automatically refresh token. Returned cookie will contain
        // the new access token.
        const apiResponse = await supertest
          .get('/internal/security/me')
          .ca(CA_CERT)
          .pfx(FIRST_CLIENT_CERT)
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        const cookies = apiResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const refreshedCookie = parseCookie(cookies[0])!;
        checkCookieIsSet(refreshedCookie);
      });

      it('non-AJAX call should re-acquire token and update existing cookie', async function () {
        this.timeout(40000);

        // Access token expiration is set to 15s for API integration tests.
        // Let's wait for 20s to make sure token expires.
        await setTimeoutAsync(20000);

        // This request should succeed and automatically refresh token. Returned cookie will contain
        // the new access and refresh token pair.
        const nonAjaxResponse = await supertest
          .get('/security/account')
          .ca(CA_CERT)
          .pfx(FIRST_CLIENT_CERT)
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        const cookies = nonAjaxResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const refreshedCookie = parseCookie(cookies[0])!;
        checkCookieIsSet(refreshedCookie);
      });

      describe('post-authentication stage', () => {
        for (const client of ['start-contract', 'request-context', 'custom']) {
          it(`expired access token should be automatically refreshed by the ${client} client`, async function () {
            this.timeout(60000);

            // Access token expiration is set to 15s for API integration tests.
            // Let's tell test endpoint to wait 30s after authentication and try to make a request to Elasticsearch
            // triggering token refresh logic.
            const response = await supertest
              .post('/authentication/slow/me')
              .ca(CA_CERT)
              .pfx(FIRST_CLIENT_CERT)
              .set('kbn-xsrf', 'xxx')
              .set('Cookie', sessionCookie.cookieString())
              .send({ duration: '30s', client })
              .expect(200);

            const newSessionCookies = response.headers['set-cookie'];
            expect(newSessionCookies).to.have.length(1);

            const refreshedCookie = parseCookie(newSessionCookies[0])!;
            checkCookieIsSet(refreshedCookie);

            // The second new cookie with fresh pair of access and refresh tokens should work.
            await supertest
              .get('/internal/security/me')
              .ca(CA_CERT)
              .pfx(FIRST_CLIENT_CERT)
              .set('kbn-xsrf', 'xxx')
              .set('Cookie', refreshedCookie.cookieString())
              .expect(200);
          });

          it(`expired access token should be automatically refreshed by the ${client} client even for multiple concurrent requests`, async function () {
            this.timeout(60000);

            // Send 5 concurrent requests with a cookie that contains an expired access token.
            await Promise.all(
              Array.from({ length: 5 }).map((value, index) =>
                supertest
                  .post(`/authentication/slow/me?a=${index}`)
                  .ca(CA_CERT)
                  .pfx(FIRST_CLIENT_CERT)
                  .set('kbn-xsrf', 'xxx')
                  .set('Cookie', sessionCookie.cookieString())
                  .send({ duration: '30s', client })
                  .expect(200)
              )
            );
          });
        }
      });
    });
  });
}
