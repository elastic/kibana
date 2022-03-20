/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'query-string';
import url from 'url';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import expect from '@kbn/expect';
import { parse as parseCookie, Cookie } from 'tough-cookie';
import { adminTestUser } from '@kbn/test';
import {
  getLogoutRequest,
  getSAMLRequestId,
  getSAMLResponse,
} from '../../fixtures/saml/saml_tools';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const randomness = getService('randomness');
  const supertest = getService('supertestWithoutAuth');
  const config = getService('config');

  const kibanaServerConfig = config.get('servers.kibana');

  function createSAMLResponse(options = {}) {
    return getSAMLResponse({
      destination: `http://localhost:${kibanaServerConfig.port}/api/security/saml/callback`,
      sessionIndex: String(randomness.naturalNumber()),
      ...options,
    });
  }

  function createLogoutRequest(options: { sessionIndex: string }) {
    return getLogoutRequest({
      destination: `http://localhost:${kibanaServerConfig.port}/logout`,
      ...options,
    });
  }

  async function checkSessionCookie(sessionCookie: Cookie, username = 'a@b.c') {
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

    expect(apiResponse.body.username).to.be(username);
    expect(apiResponse.body.authentication_realm).to.eql({ name: 'saml1', type: 'saml' });
    expect(apiResponse.body.authentication_provider).to.eql({ type: 'saml', name: 'saml' });
    expect(apiResponse.body.authentication_type).to.be('token');
  }

  describe('SAML authentication', () => {
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
          '/internal/security/capture-url?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2Bthree%26auth_provider_hint%3Dsaml'
        );
      });

      it('should properly set cookie and redirect user to IdP', async () => {
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
        expect(redirectURL.href!.startsWith(`https://elastic.co/sso/saml`)).to.be(true);
        expect(redirectURL.query.SAMLRequest).to.not.be.empty();
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
      let handshakeCookie: Cookie;
      let samlRequestId: string;

      beforeEach(async () => {
        const handshakeResponse = await supertest
          .get(
            '/abc/xyz/handshake?one=two three&auth_provider_hint=saml&auth_url_hash=%23%2Fworkpad'
          )
          .expect(302);

        handshakeCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;
        samlRequestId = await getSAMLRequestId(handshakeResponse.headers.location);
      });

      it('should fail if SAML response is not complemented with handshake cookie', async () => {
        const unauthenticatedResponse = await supertest
          .post('/api/security/saml/callback')
          .send({ SAMLResponse: await createSAMLResponse({ inResponseTo: samlRequestId }) })
          .expect(401);

        expect(unauthenticatedResponse.headers['content-security-policy']).to.be(
          `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`
        );
        expect(unauthenticatedResponse.text).to.contain('We couldn&#x27;t log you in');
      });

      it('should succeed if both SAML response and handshake cookie are provided', async () => {
        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .set('Cookie', handshakeCookie.cookieString())
          .send({ SAMLResponse: await createSAMLResponse({ inResponseTo: samlRequestId }) })
          .expect(302);

        // User should be redirected to the URL that initiated handshake.
        expect(samlAuthenticationResponse.headers.location).to.be(
          '/abc/xyz/handshake?one=two+three#/workpad'
        );

        const cookies = samlAuthenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        await checkSessionCookie(parseCookie(cookies[0])!);
      });

      it('should succeed in case of IdP initiated login', async () => {
        // Don't pass handshake cookie and don't include `inResponseTo` into SAML response to simulate IdP initiated login.
        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .send({ SAMLResponse: await createSAMLResponse() })
          .expect(302);

        // User should be redirected to the base URL.
        expect(samlAuthenticationResponse.headers.location).to.be('/');

        const cookies = samlAuthenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        await checkSessionCookie(parseCookie(cookies[0])!);
      });

      it('should fail if SAML response is not valid', async () => {
        const unauthenticatedResponse = await supertest
          .post('/api/security/saml/callback')
          .set('Cookie', handshakeCookie.cookieString())
          .send({
            SAMLResponse: await createSAMLResponse({ inResponseTo: 'some-invalid-request-id' }),
          })
          .expect(401);

        expect(unauthenticatedResponse.headers['content-security-policy']).to.be(
          `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`
        );
        expect(unauthenticatedResponse.text).to.contain('We couldn&#x27;t log you in');
      });
    });

    describe('API access with active session', () => {
      let sessionCookie: Cookie;

      beforeEach(async () => {
        // Imitate IdP initiated login.
        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .send({ SAMLResponse: await createSAMLResponse() })
          .expect(302);

        sessionCookie = parseCookie(samlAuthenticationResponse.headers['set-cookie'][0])!;
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
      let idpSessionIndex: string;

      beforeEach(async () => {
        const handshakeResponse = await supertest
          .get(
            '/abc/xyz/handshake?one=two three&auth_provider_hint=saml&auth_url_hash=%23%2Fworkpad'
          )
          .expect(302);

        const handshakeCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;
        const samlRequestId = await getSAMLRequestId(handshakeResponse.headers.location);

        idpSessionIndex = String(randomness.naturalNumber());
        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .set('Cookie', handshakeCookie.cookieString())
          .send({
            SAMLResponse: await createSAMLResponse({
              inResponseTo: samlRequestId,
              sessionIndex: idpSessionIndex,
            }),
          })
          .expect(302);

        sessionCookie = parseCookie(samlAuthenticationResponse.headers['set-cookie'][0])!;
      });

      it('should redirect to IdP with SAML request to complete logout', async () => {
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
        expect(redirectURL.href!.startsWith(`https://elastic.co/slo/saml`)).to.be(true);
        expect(redirectURL.query.SAMLRequest).to.not.be.empty();

        // Session should be invalidated and old session cookie should not allow API access.
        await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(401);
      });

      it('should redirect to `logged_out` page if session cookie is not provided', async () => {
        const logoutResponse = await supertest.get('/api/security/logout').expect(302);

        expect(logoutResponse.headers['set-cookie']).to.be(undefined);
        expect(logoutResponse.headers.location).to.be('/security/logged_out?msg=LOGGED_OUT');
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

      it('should invalidate access token on IdP initiated logout', async () => {
        const logoutRequest = await createLogoutRequest({ sessionIndex: idpSessionIndex });
        const logoutResponse = await supertest
          .get(`/api/security/logout?${stringify(logoutRequest, { sort: false })}`)
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
        expect(redirectURL.href!.startsWith(`https://elastic.co/slo/saml`)).to.be(true);
        expect(redirectURL.query.SAMLResponse).to.not.be.empty();

        // Session should be invalidated and old session cookie should not allow API access.
        await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(401);
      });

      it('should invalidate access token on IdP initiated logout even if there is no Kibana session', async () => {
        const logoutRequest = await createLogoutRequest({ sessionIndex: idpSessionIndex });
        const logoutResponse = await supertest
          .get(`/api/security/logout?${stringify(logoutRequest, { sort: false })}`)
          .expect(302);

        expect(logoutResponse.headers['set-cookie']).to.be(undefined);

        const redirectURL = url.parse(logoutResponse.headers.location, true /* parseQueryString */);
        expect(redirectURL.href!.startsWith(`https://elastic.co/slo/saml`)).to.be(true);
        expect(redirectURL.query.SAMLResponse).to.not.be.empty();

        // Elasticsearch should find and invalidate access and refresh tokens that correspond to provided
        // IdP session id (encoded in SAML LogoutRequest) even if Kibana doesn't provide them and session
        // cookie with these tokens should not allow API access.
        const apiResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(400);

        expect(apiResponse.body).to.eql({
          error: 'Bad Request',
          message: 'Both access and refresh tokens are expired.',
          statusCode: 400,
        });
      });
    });

    describe('API access with expired access token.', () => {
      let sessionCookie: Cookie;

      beforeEach(async function () {
        const handshakeResponse = await supertest
          .get(
            '/abc/xyz/handshake?one=two three&auth_provider_hint=saml&auth_url_hash=%23%2Fworkpad'
          )
          .expect(302);

        const handshakeCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;
        const samlRequestId = await getSAMLRequestId(handshakeResponse.headers.location);

        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .set('Cookie', handshakeCookie.cookieString())
          .send({ SAMLResponse: await createSAMLResponse({ inResponseTo: samlRequestId }) })
          .expect(302);

        sessionCookie = parseCookie(samlAuthenticationResponse.headers['set-cookie'][0])!;
      });

      const expectNewSessionCookie = (cookie: Cookie) => {
        expect(cookie.key).to.be('sid');
        expect(cookie.value).to.not.be.empty();
        expect(cookie.path).to.be('/');
        expect(cookie.httpOnly).to.be(true);
        expect(cookie.value).to.not.be(sessionCookie.value);
      };

      it('expired access token should be automatically refreshed', async function () {
        this.timeout(60000);

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

      it('should refresh access token even if multiple concurrent requests try to refresh it', async function () {
        this.timeout(60000);

        // Access token expiration is set to 15s for API integration tests.
        // Let's wait for 20s to make sure token expires.
        await setTimeoutAsync(20000);

        // Send 5 concurrent requests with a cookie that contains an expired access token.
        await Promise.all(
          Array.from({ length: 5 }).map((value, index) =>
            supertest
              .get(`/internal/security/me?a=${index}`)
              .set('kbn-xsrf', 'xxx')
              .set('Cookie', sessionCookie.cookieString())
              .expect(200)
          )
        );
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
            await checkSessionCookie(newSessionCookie);

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
        const samlRequestId = await getSAMLRequestId(handshakeResponse.headers.location);

        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .set('Cookie', handshakeCookie.cookieString())
          .send({ SAMLResponse: await createSAMLResponse({ inResponseTo: samlRequestId }) })
          .expect(302);

        sessionCookie = parseCookie(samlAuthenticationResponse.headers['set-cookie'][0])!;

        // Let's delete tokens from `.security` index directly to simulate the case when
        // Elasticsearch automatically removes access/refresh token document from the index
        // after some period of time.
        const esResponse = await getService('es').deleteByQuery({
          index: '.security-tokens',
          body: { query: { match: { doc_type: 'token' } } },
          refresh: true,
        });
        expect(esResponse).to.have.property('deleted').greaterThan(0);
      });

      it('should redirect user to a page that would capture URL fragment', async () => {
        const handshakeResponse = await supertest
          .get('/abc/xyz/handshake?one=two three')
          .set('Cookie', sessionCookie.cookieString())
          .expect(302);

        const cookies = handshakeResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const handshakeCookie = parseCookie(cookies[0])!;
        expect(handshakeCookie.key).to.be('sid');
        expect(handshakeCookie.value).to.be.empty();
        expect(handshakeCookie.path).to.be('/');
        expect(handshakeCookie.httpOnly).to.be(true);
        expect(handshakeCookie.maxAge).to.be(0);

        expect(handshakeResponse.headers.location).to.be(
          '/internal/security/capture-url?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2Bthree%26auth_provider_hint%3Dsaml'
        );
      });

      it('should properly set cookie and redirect user to IdP', async () => {
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
        expect(redirectURL.href!.startsWith(`https://elastic.co/sso/saml`)).to.be(true);
        expect(redirectURL.query.SAMLRequest).to.not.be.empty();
      });

      it('should start new SAML handshake even if multiple concurrent requests try to refresh access token', async () => {
        // Issue 5 concurrent requests with a cookie that contains access/refresh token pair without
        // a corresponding document in Elasticsearch.
        await Promise.all(
          Array.from({ length: 5 }).map((value, index) =>
            supertest
              .get(`/abc/xyz/handshake?one=two three&a=${index}`)
              .set('Cookie', sessionCookie.cookieString())
              .expect(302)
          )
        );
      });
    });

    describe('IdP initiated login with active session', () => {
      const existingUsername = 'a@b.c';
      let existingSessionCookie: Cookie;

      const testScenarios: Array<[string, () => Promise<void>]> = [
        // Default scenario when active cookie has an active access token.
        ['when access token is valid', async () => {}],
        // Scenario when active cookie has an expired access token. Access token expiration is set
        // to 15s for API integration tests so we need to wait for 20s to make sure token expires.
        ['when access token is expired', async () => await setTimeoutAsync(20000)],
        // Scenario when active cookie references to access/refresh token pair that were already
        // removed from Elasticsearch (to simulate 24h when expired tokens are removed).
        [
          'when access token document is missing',
          async () => {
            const esResponse = await getService('es').deleteByQuery({
              index: '.security-tokens',
              body: { query: { match: { doc_type: 'token' } } },
              refresh: true,
            });
            expect(esResponse).to.have.property('deleted').greaterThan(0);
          },
        ],
      ];

      beforeEach(async () => {
        const handshakeResponse = await supertest
          .get(
            '/abc/xyz/handshake?one=two three&auth_provider_hint=saml&auth_url_hash=%23%2Fworkpad'
          )
          .expect(302);

        const handshakeCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;
        const samlRequestId = await getSAMLRequestId(handshakeResponse.headers.location);

        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .set('Cookie', handshakeCookie.cookieString())
          .send({
            SAMLResponse: await createSAMLResponse({
              inResponseTo: samlRequestId,
              username: existingUsername,
            }),
          })
          .expect(302);

        existingSessionCookie = parseCookie(samlAuthenticationResponse.headers['set-cookie'][0])!;
      });

      for (const [description, setup] of testScenarios) {
        it(`should renew session and redirect to the home page if login is for the same user ${description}`, async () => {
          await setup();

          const samlAuthenticationResponse = await supertest
            .post('/api/security/saml/callback')
            .set('Cookie', existingSessionCookie.cookieString())
            .send({ SAMLResponse: await createSAMLResponse({ username: existingUsername }) })
            .expect(302);

          expect(samlAuthenticationResponse.headers.location).to.be('/');

          const newSessionCookie = parseCookie(
            samlAuthenticationResponse.headers['set-cookie'][0]
          )!;
          expect(newSessionCookie.value).to.not.be.empty();
          expect(newSessionCookie.value).to.not.equal(existingSessionCookie.value);

          // Same user, same provider - session ID hasn't changed and cookie should still be valid.
          await supertest
            .get('/internal/security/me')
            .set('kbn-xsrf', 'xxx')
            .set('Cookie', existingSessionCookie.cookieString())
            .expect(200);

          // New session cookie is also valid.
          await checkSessionCookie(newSessionCookie);
        });

        it(`should create a new session and redirect to the \`overwritten_session\` if login is for another user ${description}`, async () => {
          await setup();

          const newUsername = 'c@d.e';
          const samlAuthenticationResponse = await supertest
            .post('/api/security/saml/callback')
            .set('Cookie', existingSessionCookie.cookieString())
            .send({ SAMLResponse: await createSAMLResponse({ username: newUsername }) })
            .expect(302);

          expect(samlAuthenticationResponse.headers.location).to.be(
            '/security/overwritten_session?next=%2F'
          );

          const newSessionCookie = parseCookie(
            samlAuthenticationResponse.headers['set-cookie'][0]
          )!;
          expect(newSessionCookie.value).to.not.be.empty();
          expect(newSessionCookie.value).to.not.equal(existingSessionCookie.value);

          // New username - old session is invalidated and session ID in the cookie no longer valid.
          await supertest
            .get('/internal/security/me')
            .set('kbn-xsrf', 'xxx')
            .set('Cookie', existingSessionCookie.cookieString())
            .expect(401);

          // Only tokens from new session are valid.
          await checkSessionCookie(newSessionCookie, newUsername);
        });
      }
    });
  });
}
