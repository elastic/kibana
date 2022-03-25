/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse as parseCookie, Cookie } from 'tough-cookie';
import url from 'url';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { adminTestUser } from '@kbn/test';
import { getStateAndNonce } from '../../../fixtures/oidc/oidc_tools';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');

  describe('OpenID Connect authentication', () => {
    it('should reject API requests if client is not authenticated', async () => {
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .expect(401, { statusCode: 401, error: 'Unauthorized', message: 'Unauthorized' });
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

      const { body: user } = await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', parseCookie(cookies[0])!.cookieString())
        .expect(200);

      expect(user.username).to.eql(adminTestUser.username);
      expect(user.authentication_provider).to.eql({ type: 'basic', name: 'basic' });
      expect(user.authentication_type).to.be('realm');
      // Do not assert on the `authentication_realm`, as the value differs for on-prem vs cloud
    });

    describe('initiating handshake', () => {
      it('should redirect user to a page that would capture URL fragment', async () => {
        const handshakeResponse = await supertest
          .get('/abc/xyz/handshake?one=two three')
          .expect(302);

        expect(handshakeResponse.headers['set-cookie']).to.be(undefined);
        expect(handshakeResponse.headers.location).to.be(
          '/internal/security/capture-url?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2Bthree%26auth_provider_hint%3Doidc'
        );
      });

      it('should properly set cookie, return all parameters and redirect user', async () => {
        const handshakeResponse = await supertest
          .get(
            '/abc/xyz/handshake?one=two three&auth_provider_hint=saml&auth_url_hash=%23%2Fworkpad'
          )
          .expect(302);

        const cookies = handshakeResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const handshakeCookie = parseCookie(cookies[0])!;
        expect(handshakeCookie.key).to.be('sid');
        expect(handshakeCookie.value).to.not.be.empty();
        expect(handshakeCookie.path).to.be('/');
        expect(handshakeCookie.httpOnly).to.be(true);

        const redirectURL = url.parse(
          handshakeResponse.headers.location,
          true /* parseQueryString */
        );
        expect(
          redirectURL.href!.startsWith(`https://test-op.elastic.co/oauth2/v1/authorize`)
        ).to.be(true);
        expect(redirectURL.query.scope).to.not.be.empty();
        expect(redirectURL.query.response_type).to.not.be.empty();
        expect(redirectURL.query.client_id).to.not.be.empty();
        expect(redirectURL.query.redirect_uri).to.not.be.empty();
        expect(redirectURL.query.state).to.not.be.empty();
        expect(redirectURL.query.nonce).to.not.be.empty();
      });

      it('should properly set cookie, return all parameters and redirect user for Third Party initiated', async () => {
        const handshakeResponse = await supertest
          .post('/api/security/oidc/initiate_login')
          .send({ iss: 'https://test-op.elastic.co' })
          .expect(302);

        const cookies = handshakeResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const handshakeCookie = parseCookie(cookies[0])!;
        expect(handshakeCookie.key).to.be('sid');
        expect(handshakeCookie.value).to.not.be.empty();
        expect(handshakeCookie.path).to.be('/');
        expect(handshakeCookie.httpOnly).to.be(true);

        const redirectURL = url.parse(
          handshakeResponse.headers.location,
          true /* parseQueryString */
        );
        expect(
          redirectURL.href!.startsWith(`https://test-op.elastic.co/oauth2/v1/authorize`)
        ).to.be(true);
        expect(redirectURL.query.scope).to.not.be.empty();
        expect(redirectURL.query.response_type).to.not.be.empty();
        expect(redirectURL.query.client_id).to.not.be.empty();
        expect(redirectURL.query.redirect_uri).to.not.be.empty();
        expect(redirectURL.query.state).to.not.be.empty();
        expect(redirectURL.query.nonce).to.not.be.empty();
      });

      it('should not allow access to the API with the handshake cookie', async () => {
        const handshakeResponse = await supertest
          .get(
            '/abc/xyz/handshake?one=two three&auth_provider_hint=saml&auth_url_hash=%23%2Fworkpad'
          )
          .expect(302);

        const handshakeCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;
        await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .expect(401);
      });

      it('AJAX requests should not initiate handshake', async () => {
        const ajaxResponse = await supertest
          .get('/abc/xyz/handshake?one=two three')
          .set('kbn-xsrf', 'xxx')
          .expect(401);

        expect(ajaxResponse.headers['set-cookie']).to.be(undefined);
      });
    });

    describe('finishing handshake', () => {
      let stateAndNonce: { state: string; nonce: string };
      let handshakeCookie: Cookie;

      beforeEach(async () => {
        const handshakeResponse = await supertest
          .get(
            '/abc/xyz/handshake?one=two three&auth_provider_hint=saml&auth_url_hash=%23%2Fworkpad'
          )
          .expect(302);

        handshakeCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;
        stateAndNonce = getStateAndNonce(handshakeResponse.headers.location);
        // Set the nonce in our mock OIDC Provider so that it can generate the ID Tokens
        await supertest
          .post('/api/oidc_provider/setup')
          .set('kbn-xsrf', 'xxx')
          .send({ nonce: stateAndNonce.nonce })
          .expect(200);
      });

      it('should fail if OpenID Connect response is not complemented with handshake cookie', async () => {
        const unauthenticatedResponse = await supertest
          .get(`/api/security/oidc/callback?code=thisisthecode&state=${stateAndNonce.state}`)
          .expect(401);

        expect(unauthenticatedResponse.headers['content-security-policy']).to.be(
          `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`
        );
        expect(unauthenticatedResponse.text).to.contain('We couldn&#x27;t log you in');
      });

      it('should fail if state is not matching', async () => {
        const unauthenticatedResponse = await supertest
          .get(`/api/security/oidc/callback?code=thisisthecode&state=someothervalue`)
          .set('Cookie', handshakeCookie.cookieString())
          .expect(401);

        expect(unauthenticatedResponse.headers['content-security-policy']).to.be(
          `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`
        );
        expect(unauthenticatedResponse.text).to.contain('We couldn&#x27;t log you in');
      });

      it('should succeed if both the OpenID Connect response and the cookie are provided', async () => {
        const oidcAuthenticationResponse = await supertest
          .get(`/api/security/oidc/callback?code=code1&state=${stateAndNonce.state}`)
          .set('Cookie', handshakeCookie.cookieString())
          .expect(302);

        // User should be redirected to the URL that initiated handshake.
        expect(oidcAuthenticationResponse.headers.location).to.be(
          '/abc/xyz/handshake?one=two+three#/workpad'
        );

        const cookies = oidcAuthenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const sessionCookie = parseCookie(cookies[0])!;
        expect(sessionCookie.key).to.be('sid');
        expect(sessionCookie.value).to.not.be.empty();
        expect(sessionCookie.path).to.be('/');
        expect(sessionCookie.httpOnly).to.be(true);

        const apiResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);
        expect(apiResponse.body).to.only.have.keys([
          'username',
          'full_name',
          'email',
          'roles',
          'metadata',
          'enabled',
          'authentication_realm',
          'lookup_realm',
          'authentication_provider',
          'authentication_type',
        ]);

        expect(apiResponse.body.username).to.be('user1');
        expect(apiResponse.body.authentication_realm).to.eql({ name: 'oidc1', type: 'oidc' });
        expect(apiResponse.body.authentication_provider).to.eql({ type: 'oidc', name: 'oidc' });
        expect(apiResponse.body.authentication_type).to.be('token');
      });
    });

    describe('Complete third party initiated authentication', () => {
      it('should authenticate a user when a third party initiates the authentication', async () => {
        const handshakeResponse = await supertest
          .get('/api/security/oidc/initiate_login?iss=https://test-op.elastic.co')
          .expect(302);
        const handshakeCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;
        const stateAndNonce = getStateAndNonce(handshakeResponse.headers.location);

        // Set the nonce in our mock OIDC Provider so that it can generate the ID Tokens
        await supertest
          .post('/api/oidc_provider/setup')
          .set('kbn-xsrf', 'xxx')
          .send({ nonce: stateAndNonce.nonce })
          .expect(200);

        const oidcAuthenticationResponse = await supertest
          .get(`/api/security/oidc/callback?code=code2&state=${stateAndNonce.state}`)
          .set('Cookie', handshakeCookie.cookieString())
          .expect(302);
        const cookies = oidcAuthenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const sessionCookie = parseCookie(cookies[0])!;
        expect(sessionCookie.key).to.be('sid');
        expect(sessionCookie.value).to.not.be.empty();
        expect(sessionCookie.path).to.be('/');
        expect(sessionCookie.httpOnly).to.be(true);

        const apiResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);
        expect(apiResponse.body).to.only.have.keys([
          'username',
          'full_name',
          'email',
          'roles',
          'metadata',
          'enabled',
          'authentication_realm',
          'lookup_realm',
          'authentication_provider',
          'authentication_type',
        ]);

        expect(apiResponse.body.username).to.be('user2');
        expect(apiResponse.body.authentication_realm).to.eql({ name: 'oidc1', type: 'oidc' });
        expect(apiResponse.body.authentication_provider).to.eql({ type: 'oidc', name: 'oidc' });
        expect(apiResponse.body.authentication_type).to.be('token');
      });
    });

    describe('API access with active session', () => {
      let stateAndNonce: { state: string; nonce: string };
      let sessionCookie: Cookie;

      beforeEach(async () => {
        const handshakeResponse = await supertest
          .get(
            '/abc/xyz/handshake?one=two three&auth_provider_hint=saml&auth_url_hash=%23%2Fworkpad'
          )
          .expect(302);

        sessionCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;
        stateAndNonce = getStateAndNonce(handshakeResponse.headers.location);
        // Set the nonce in our mock OIDC Provider so that it can generate the ID Tokens
        await supertest
          .post('/api/oidc_provider/setup')
          .set('kbn-xsrf', 'xxx')
          .send({ nonce: stateAndNonce.nonce })
          .expect(200);

        const oidcAuthenticationResponse = await supertest
          .get(`/api/security/oidc/callback?code=code1&state=${stateAndNonce.state}`)
          .set('Cookie', sessionCookie.cookieString())
          .expect(302);

        sessionCookie = parseCookie(oidcAuthenticationResponse.headers['set-cookie'][0])!;
      });

      it('should extend cookie on every successful non-system API call', async () => {
        const apiResponseOne = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(apiResponseOne.headers['set-cookie']).to.not.be(undefined);
        const sessionCookieOne = parseCookie(apiResponseOne.headers['set-cookie'][0])!;

        expect(sessionCookieOne.value).to.not.be.empty();
        expect(sessionCookieOne.value).to.not.equal(sessionCookie.value);

        const apiResponseTwo = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(apiResponseTwo.headers['set-cookie']).to.not.be(undefined);
        const sessionCookieTwo = parseCookie(apiResponseTwo.headers['set-cookie'][0])!;

        expect(sessionCookieTwo.value).to.not.be.empty();
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
          .set('Authorization', 'Basic AbCdEf')
          .set('Cookie', sessionCookie.cookieString())
          .expect(401);

        expect(apiResponse.headers['set-cookie']).to.be(undefined);
      });
    });

    describe('logging out', () => {
      let sessionCookie: Cookie;

      beforeEach(async () => {
        const handshakeResponse = await supertest
          .get(
            '/abc/xyz/handshake?one=two three&auth_provider_hint=saml&auth_url_hash=%23%2Fworkpad'
          )
          .expect(302);

        const handshakeCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;
        const stateAndNonce = getStateAndNonce(handshakeResponse.headers.location);
        // Set the nonce in our mock OIDC Provider so that it can generate the ID Tokens
        await supertest
          .post('/api/oidc_provider/setup')
          .set('kbn-xsrf', 'xxx')
          .send({ nonce: stateAndNonce.nonce })
          .expect(200);

        const oidcAuthenticationResponse = await supertest
          .get(`/api/security/oidc/callback?code=code1&state=${stateAndNonce.state}`)
          .set('Cookie', handshakeCookie.cookieString())
          .expect(302);

        const cookies = oidcAuthenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        sessionCookie = parseCookie(cookies[0])!;
      });

      it('should redirect to home page if session cookie is not provided', async () => {
        const logoutResponse = await supertest.get('/api/security/logout').expect(302);

        expect(logoutResponse.headers['set-cookie']).to.be(undefined);
        expect(logoutResponse.headers.location).to.be('/security/logged_out?msg=LOGGED_OUT');
      });

      it('should redirect to the OPs endsession endpoint to complete logout', async () => {
        const logoutResponse = await supertest
          .get('/api/security/logout')
          .set('Cookie', sessionCookie.cookieString())
          .expect(302);

        const cookies = logoutResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const logoutCookie = parseCookie(cookies[0])!;
        expect(logoutCookie.key).to.be('sid');
        expect(logoutCookie.value).to.be.empty();
        expect(logoutCookie.path).to.be('/');
        expect(logoutCookie.httpOnly).to.be(true);
        expect(logoutCookie.maxAge).to.be(0);

        const redirectURL = url.parse(logoutResponse.headers.location, true /* parseQueryString */);
        expect(
          redirectURL.href!.startsWith(`https://test-op.elastic.co/oauth2/v1/endsession`)
        ).to.be(true);
        expect(redirectURL.query.id_token_hint).to.not.be.empty();

        // Session should be invalidated and old session cookie should not allow API access.
        await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(401);
      });

      it('should reject AJAX requests', async () => {
        const ajaxResponse = await supertest
          .get('/api/security/logout')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(400);

        expect(ajaxResponse.headers['set-cookie']).to.be(undefined);
        expect(ajaxResponse.body).to.eql({
          error: 'Bad Request',
          message: 'Client should be able to process redirect response.',
          statusCode: 400,
        });
      });
    });

    describe('API access with expired access token.', () => {
      let sessionCookie: Cookie;

      beforeEach(async () => {
        const handshakeResponse = await supertest
          .get(
            '/abc/xyz/handshake?one=two three&auth_provider_hint=saml&auth_url_hash=%23%2Fworkpad'
          )
          .expect(302);

        const handshakeCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;
        const stateAndNonce = getStateAndNonce(handshakeResponse.headers.location);
        // Set the nonce in our mock OIDC Provider so that it can generate the ID Tokens
        await supertest
          .post('/api/oidc_provider/setup')
          .set('kbn-xsrf', 'xxx')
          .send({ nonce: stateAndNonce.nonce })
          .expect(200);

        const oidcAuthenticationResponse = await supertest
          .get(`/api/security/oidc/callback?code=code1&state=${stateAndNonce.state}`)
          .set('Cookie', handshakeCookie.cookieString())
          .expect(302);

        const cookies = oidcAuthenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        sessionCookie = parseCookie(cookies[0])!;
      });

      const expectNewSessionCookie = (cookie: Cookie) => {
        expect(cookie.key).to.be('sid');
        expect(cookie.value).to.not.be.empty();
        expect(cookie.path).to.be('/');
        expect(cookie.httpOnly).to.be(true);
        expect(cookie.value).to.not.be(sessionCookie.value);
      };

      it('expired access token should be automatically refreshed', async function () {
        this.timeout(40000);

        // Access token expiration is set to 15s for API integration tests.
        // Let's wait for 20s to make sure token expires.
        await setTimeoutAsync(20000);

        // This api call should succeed and automatically refresh token. Returned cookie will contain
        // the new access and refresh token pair.
        const firstResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        const firstResponseCookies = firstResponse.headers['set-cookie'];
        expect(firstResponseCookies).to.have.length(1);

        const firstNewCookie = parseCookie(firstResponseCookies[0])!;
        expectNewSessionCookie(firstNewCookie);

        // Request with old cookie should reuse the same refresh token if within 60 seconds.
        // Returned cookie will contain the same new access and refresh token pairs as the first request
        const secondResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        const secondResponseCookies = secondResponse.headers['set-cookie'];
        expect(secondResponseCookies).to.have.length(1);

        const secondNewCookie = parseCookie(secondResponseCookies[0])!;
        expectNewSessionCookie(secondNewCookie);

        expect(firstNewCookie.value).not.to.eql(secondNewCookie.value);

        // The first new cookie with fresh pair of access and refresh tokens should work.
        await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', firstNewCookie.cookieString())
          .expect(200);

        // The second new cookie with fresh pair of access and refresh tokens should work.
        await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', secondNewCookie.cookieString())
          .expect(200);
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
              .set('kbn-xsrf', 'xxx')
              .set('Cookie', sessionCookie.cookieString())
              .send({ duration: '30s', client })
              .expect(200);

            const newSessionCookies = response.headers['set-cookie'];
            expect(newSessionCookies).to.have.length(1);

            const newSessionCookie = parseCookie(newSessionCookies[0])!;
            expectNewSessionCookie(newSessionCookie);

            // The second new cookie with fresh pair of access and refresh tokens should work.
            await supertest
              .get('/internal/security/me')
              .set('kbn-xsrf', 'xxx')
              .set('Cookie', newSessionCookie.cookieString())
              .expect(200);
          });

          it(`expired access token should be automatically refreshed by the ${client} client even for multiple concurrent requests`, async function () {
            this.timeout(60000);

            // Send 5 concurrent requests with a cookie that contains an expired access token.
            await Promise.all(
              Array.from({ length: 5 }).map((value, index) =>
                supertest
                  .post(`/authentication/slow/me?a=${index}`)
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

    describe('API access with missing access token document.', () => {
      let sessionCookie: Cookie;

      beforeEach(async () => {
        const handshakeResponse = await supertest
          .get(
            '/abc/xyz/handshake?one=two three&auth_provider_hint=saml&auth_url_hash=%23%2Fworkpad'
          )
          .expect(302);

        const handshakeCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;
        const stateAndNonce = getStateAndNonce(handshakeResponse.headers.location);
        // Set the nonce in our mock OIDC Provider so that it can generate the ID Tokens
        await supertest
          .post('/api/oidc_provider/setup')
          .set('kbn-xsrf', 'xxx')
          .send({ nonce: stateAndNonce.nonce })
          .expect(200);

        const oidcAuthenticationResponse = await supertest
          .get(`/api/security/oidc/callback?code=code1&state=${stateAndNonce.state}`)
          .set('Cookie', handshakeCookie.cookieString())
          .expect(302);

        const cookies = oidcAuthenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        sessionCookie = parseCookie(cookies[0])!;
      });

      it('should properly set cookie and start new OIDC handshake', async function () {
        // Let's delete tokens from `.security-tokens` index directly to simulate the case when
        // Elasticsearch automatically removes access/refresh token document from the index
        // after some period of time.
        const esResponse = await getService('es').deleteByQuery({
          index: '.security-tokens',
          body: { query: { match: { doc_type: 'token' } } },
          refresh: true,
        });
        expect(esResponse).to.have.property('deleted').greaterThan(0);

        const handshakeResponse = await supertest
          .get(
            '/abc/xyz/handshake?one=two three&auth_provider_hint=saml&auth_url_hash=%23%2Fworkpad'
          )
          .set('Cookie', sessionCookie.cookieString())
          .expect(302);

        const cookies = handshakeResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const handshakeCookie = parseCookie(cookies[0])!;
        expect(handshakeCookie.key).to.be('sid');
        expect(handshakeCookie.value).to.not.be.empty();
        expect(handshakeCookie.path).to.be('/');
        expect(handshakeCookie.httpOnly).to.be(true);

        const redirectURL = url.parse(
          handshakeResponse.headers.location,
          true /* parseQueryString */
        );
        expect(
          redirectURL.href!.startsWith(`https://test-op.elastic.co/oauth2/v1/authorize`)
        ).to.be(true);
        expect(redirectURL.query.scope).to.not.be.empty();
        expect(redirectURL.query.response_type).to.not.be.empty();
        expect(redirectURL.query.client_id).to.not.be.empty();
        expect(redirectURL.query.redirect_uri).to.not.be.empty();
        expect(redirectURL.query.state).to.not.be.empty();
        expect(redirectURL.query.nonce).to.not.be.empty();
      });
    });
  });
}
