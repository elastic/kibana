/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import querystring from 'querystring';
import url from 'url';
import { delay } from 'bluebird';
import expect from '@kbn/expect';
import request, { Cookie } from 'request';
import { JSDOM } from 'jsdom';
import { getLogoutRequest, getSAMLRequestId, getSAMLResponse } from '../../fixtures/saml_tools';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const randomness = getService('randomness');
  const supertest = getService('supertestWithoutAuth');
  const config = getService('config');

  const kibanaServerConfig = config.get('servers.kibana');

  function createSAMLResponse(options = {}) {
    return getSAMLResponse({
      destination: `http://localhost:${kibanaServerConfig.port}/api/security/v1/saml`,
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

  async function checkSessionCookie(sessionCookie: Cookie) {
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
    ]);

    expect(apiResponse.body.username).to.be('a@b.c');
  }

  describe('SAML authentication', () => {
    it('should reject API requests if client is not authenticated', async () => {
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .expect(401);
    });

    it('does not prevent basic login', async () => {
      const [username, password] = config.get('servers.elasticsearch.auth').split(':');
      const response = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username, password })
        .expect(204);

      const cookies = response.headers['set-cookie'];
      expect(cookies).to.have.length(1);

      const { body: user } = await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', request.cookie(cookies[0])!.cookieString())
        .expect(200);

      expect(user.username).to.eql(username);
      expect(user.authentication_realm).to.eql({ name: 'reserved', type: 'reserved' });
    });

    describe('capture URL fragment', () => {
      it('should redirect user to a page that would capture URL fragment', async () => {
        const handshakeResponse = await supertest
          .get('/abc/xyz/handshake?one=two three')
          .expect(302);

        // The cookie should capture current path.
        const cookies = handshakeResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const handshakeCookie = request.cookie(cookies[0])!;
        expect(handshakeCookie.key).to.be('sid');
        expect(handshakeCookie.value).to.not.be.empty();
        expect(handshakeCookie.path).to.be('/');
        expect(handshakeCookie.httpOnly).to.be(true);

        expect(handshakeResponse.headers.location).to.be('/api/security/saml/capture-url-fragment');
      });

      it('should return an HTML page that will extract URL fragment', async () => {
        const response = await supertest.get('/api/security/saml/capture-url-fragment').expect(200);

        const kibanaBaseURL = url.format({ ...config.get('servers.kibana'), auth: false });
        const dom = new JSDOM(response.text, {
          url: kibanaBaseURL,
          runScripts: 'dangerously',
          resources: 'usable',
          beforeParse(window) {
            // JSDOM doesn't support changing of `window.location` and throws an exception if script
            // tries to do that and we have to workaround this behaviour. We also need to wait until our
            // script is loaded and executed, __isScriptExecuted__ is used exactly for that.
            (window as Record<string, any>).__isScriptExecuted__ = new Promise(resolve => {
              Object.defineProperty(window, 'location', {
                value: {
                  hash: '#/workpad',
                  href: `${kibanaBaseURL}/api/security/saml/capture-url-fragment#/workpad`,
                  replace(newLocation: string) {
                    this.href = newLocation;
                    resolve();
                  },
                },
              });
            });
          },
        });

        await (dom.window as Record<string, any>).__isScriptExecuted__;

        // Check that proxy page is returned with proper headers.
        expect(response.headers['content-type']).to.be('text/html; charset=utf-8');
        expect(response.headers['cache-control']).to.be('private, no-cache, no-store');
        expect(response.headers['content-security-policy']).to.be(
          `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`
        );

        // Check that script that forwards URL fragment worked correctly.
        expect(dom.window.location.href).to.be(
          '/api/security/saml/start?redirectURLFragment=%23%2Fworkpad'
        );
      });
    });

    describe('initiating handshake', () => {
      const initiateHandshakeURL = `/api/security/saml/start?redirectURLFragment=%23%2Fworkpad`;

      let captureURLCookie: Cookie;
      beforeEach(async () => {
        const response = await supertest.get('/abc/xyz/handshake?one=two three').expect(302);
        captureURLCookie = request.cookie(response.headers['set-cookie'][0])!;
      });

      it('should properly set cookie and redirect user to IdP', async () => {
        const handshakeResponse = await supertest
          .get(initiateHandshakeURL)
          .set('Cookie', captureURLCookie.cookieString())
          .expect(302);

        const cookies = handshakeResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const handshakeCookie = request.cookie(cookies[0])!;
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

      it('should not allow access to the API', async () => {
        const handshakeResponse = await supertest
          .get(initiateHandshakeURL)
          .set('Cookie', captureURLCookie.cookieString())
          .expect(302);

        const handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
        await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .expect(401);
      });

      it('AJAX requests should not initiate handshake', async () => {
        const ajaxResponse = await supertest
          .get(initiateHandshakeURL)
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', captureURLCookie.cookieString())
          .expect(401);

        expect(ajaxResponse.headers['set-cookie']).to.be(undefined);
      });
    });

    describe('finishing handshake', () => {
      let handshakeCookie: Cookie;
      let samlRequestId: string;

      beforeEach(async () => {
        const captureURLResponse = await supertest
          .get('/abc/xyz/handshake?one=two three')
          .expect(302);
        const captureURLCookie = request.cookie(captureURLResponse.headers['set-cookie'][0])!;

        const handshakeResponse = await supertest
          .get(`/api/security/saml/start?redirectURLFragment=%23%2Fworkpad`)
          .set('Cookie', captureURLCookie.cookieString())
          .expect(302);

        handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
        samlRequestId = await getSAMLRequestId(handshakeResponse.headers.location);
      });

      it('should fail if SAML response is not complemented with handshake cookie', async () => {
        await supertest
          .post('/api/security/saml/callback')
          .set('kbn-xsrf', 'xxx')
          .send({ SAMLResponse: await createSAMLResponse({ inResponseTo: samlRequestId }) })
          .expect(401);
      });

      it('should succeed if both SAML response and handshake cookie are provided', async () => {
        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .send({ SAMLResponse: await createSAMLResponse({ inResponseTo: samlRequestId }) })
          .expect(302);

        // User should be redirected to the URL that initiated handshake.
        expect(samlAuthenticationResponse.headers.location).to.be(
          '/abc/xyz/handshake?one=two%20three#/workpad'
        );

        const cookies = samlAuthenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        await checkSessionCookie(request.cookie(cookies[0])!);
      });

      it('should succeed in case of IdP initiated login', async () => {
        // Don't pass handshake cookie and don't include `inResponseTo` into SAML response to simulate IdP initiated login.
        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .set('kbn-xsrf', 'xxx')
          .send({ SAMLResponse: await createSAMLResponse() })
          .expect(302);

        // User should be redirected to the base URL.
        expect(samlAuthenticationResponse.headers.location).to.be('/');

        const cookies = samlAuthenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        await checkSessionCookie(request.cookie(cookies[0])!);
      });

      it('should fail if SAML response is not valid', async () => {
        await supertest
          .post('/api/security/saml/callback')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .send({
            SAMLResponse: await createSAMLResponse({ inResponseTo: 'some-invalid-request-id' }),
          })
          .expect(401);
      });
    });

    describe('API access with active session', () => {
      let sessionCookie: Cookie;

      beforeEach(async () => {
        // Imitate IdP initiated login.
        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .set('kbn-xsrf', 'xxx')
          .send({ SAMLResponse: await createSAMLResponse() })
          .expect(302);

        sessionCookie = request.cookie(samlAuthenticationResponse.headers['set-cookie'][0])!;
      });

      it('should extend cookie on every successful non-system API call', async () => {
        const apiResponseOne = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(apiResponseOne.headers['set-cookie']).to.not.be(undefined);
        const sessionCookieOne = request.cookie(apiResponseOne.headers['set-cookie'][0])!;

        expect(sessionCookieOne.value).to.not.be.empty();
        expect(sessionCookieOne.value).to.not.equal(sessionCookie.value);

        const apiResponseTwo = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(apiResponseTwo.headers['set-cookie']).to.not.be(undefined);
        const sessionCookieTwo = request.cookie(apiResponseTwo.headers['set-cookie'][0])!;

        expect(sessionCookieTwo.value).to.not.be.empty();
        expect(sessionCookieTwo.value).to.not.equal(sessionCookieOne.value);
      });

      it('should not extend cookie for system API calls', async () => {
        const systemAPIResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('kbn-system-api', 'true')
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
        const captureURLResponse = await supertest
          .get('/abc/xyz/handshake?one=two three')
          .expect(302);
        const captureURLCookie = request.cookie(captureURLResponse.headers['set-cookie'][0])!;

        const handshakeResponse = await supertest
          .get(`/api/security/saml/start?redirectURLFragment=${encodeURIComponent('#workpad')}`)
          .set('Cookie', captureURLCookie.cookieString())
          .expect(302);

        const handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
        const samlRequestId = await getSAMLRequestId(handshakeResponse.headers.location);

        idpSessionIndex = String(randomness.naturalNumber());
        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .send({
            SAMLResponse: await createSAMLResponse({
              inResponseTo: samlRequestId,
              sessionIndex: idpSessionIndex,
            }),
          })
          .expect(302);

        sessionCookie = request.cookie(samlAuthenticationResponse.headers['set-cookie'][0])!;
      });

      it('should redirect to IdP with SAML request to complete logout', async () => {
        const logoutResponse = await supertest
          .get('/api/security/logout')
          .set('Cookie', sessionCookie.cookieString())
          .expect(302);

        const cookies = logoutResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const logoutCookie = request.cookie(cookies[0])!;
        expect(logoutCookie.key).to.be('sid');
        expect(logoutCookie.value).to.be.empty();
        expect(logoutCookie.path).to.be('/');
        expect(logoutCookie.httpOnly).to.be(true);
        expect(logoutCookie.maxAge).to.be(0);

        const redirectURL = url.parse(logoutResponse.headers.location, true /* parseQueryString */);
        expect(redirectURL.href!.startsWith(`https://elastic.co/slo/saml`)).to.be(true);
        expect(redirectURL.query.SAMLRequest).to.not.be.empty();

        // Tokens that were stored in the previous cookie should be invalidated as well and old
        // session cookie should not allow API access.
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

      it('should redirect to home page if session cookie is not provided', async () => {
        const logoutResponse = await supertest.get('/api/security/logout').expect(302);

        expect(logoutResponse.headers['set-cookie']).to.be(undefined);
        expect(logoutResponse.headers.location).to.be('/');
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
          .get(`/api/security/logout?${querystring.stringify(logoutRequest)}`)
          .set('Cookie', sessionCookie.cookieString())
          .expect(302);

        const cookies = logoutResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const logoutCookie = request.cookie(cookies[0])!;
        expect(logoutCookie.key).to.be('sid');
        expect(logoutCookie.value).to.be.empty();
        expect(logoutCookie.path).to.be('/');
        expect(logoutCookie.httpOnly).to.be(true);
        expect(logoutCookie.maxAge).to.be(0);

        const redirectURL = url.parse(logoutResponse.headers.location, true /* parseQueryString */);
        expect(redirectURL.href!.startsWith(`https://elastic.co/slo/saml`)).to.be(true);
        expect(redirectURL.query.SAMLResponse).to.not.be.empty();

        // Tokens that were stored in the previous cookie should be invalidated as well and old session
        // cookie should not allow API access.
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

      it('should invalidate access token on IdP initiated logout even if there is no Kibana session', async () => {
        const logoutRequest = await createLogoutRequest({ sessionIndex: idpSessionIndex });
        const logoutResponse = await supertest
          .get(`/api/security/logout?${querystring.stringify(logoutRequest)}`)
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

      beforeEach(async () => {
        const captureURLResponse = await supertest
          .get('/abc/xyz/handshake?one=two three')
          .expect(302);
        const captureURLCookie = request.cookie(captureURLResponse.headers['set-cookie'][0])!;

        const handshakeResponse = await supertest
          .get(`/api/security/saml/start?redirectURLFragment=${encodeURIComponent('#workpad')}`)
          .set('Cookie', captureURLCookie.cookieString())
          .expect(302);

        const handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
        const samlRequestId = await getSAMLRequestId(handshakeResponse.headers.location);

        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .send({ SAMLResponse: await createSAMLResponse({ inResponseTo: samlRequestId }) })
          .expect(302);

        sessionCookie = request.cookie(samlAuthenticationResponse.headers['set-cookie'][0])!;
      });

      const expectNewSessionCookie = (cookie: Cookie) => {
        expect(cookie.key).to.be('sid');
        expect(cookie.value).to.not.be.empty();
        expect(cookie.path).to.be('/');
        expect(cookie.httpOnly).to.be(true);
        expect(cookie.value).to.not.be(sessionCookie.value);
      };

      it('expired access token should be automatically refreshed', async function() {
        this.timeout(40000);

        // Access token expiration is set to 15s for API integration tests.
        // Let's wait for 20s to make sure token expires.
        await delay(20000);

        // This api call should succeed and automatically refresh token. Returned cookie will contain
        // the new access and refresh token pair.
        const firstResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        const firstResponseCookies = firstResponse.headers['set-cookie'];
        expect(firstResponseCookies).to.have.length(1);

        const firstNewCookie = request.cookie(firstResponseCookies[0])!;
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

        const secondNewCookie = request.cookie(secondResponseCookies[0])!;
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
    });

    describe('API access with missing access token document.', () => {
      let sessionCookie: Cookie;

      beforeEach(async () => {
        const captureURLResponse = await supertest
          .get('/abc/xyz/handshake?one=two three')
          .expect(302);
        const captureURLCookie = request.cookie(captureURLResponse.headers['set-cookie'][0])!;

        const handshakeResponse = await supertest
          .get(`/api/security/saml/start?redirectURLFragment=${encodeURIComponent('#workpad')}`)
          .set('Cookie', captureURLCookie.cookieString())
          .expect(302);

        const handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
        const samlRequestId = await getSAMLRequestId(handshakeResponse.headers.location);

        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .send({ SAMLResponse: await createSAMLResponse({ inResponseTo: samlRequestId }) })
          .expect(302);

        sessionCookie = request.cookie(samlAuthenticationResponse.headers['set-cookie'][0])!;
      });

      it('should properly set cookie and start new SAML handshake', async function() {
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

        const handshakeResponse = await supertest
          .get('/abc/xyz/handshake?one=two three')
          .set('Cookie', sessionCookie.cookieString())
          .expect(302);

        const cookies = handshakeResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const handshakeCookie = request.cookie(cookies[0])!;
        expect(handshakeCookie.key).to.be('sid');
        expect(handshakeCookie.value).to.not.be.empty();
        expect(handshakeCookie.path).to.be('/');
        expect(handshakeCookie.httpOnly).to.be(true);

        expect(handshakeResponse.headers.location).to.be('/api/security/saml/capture-url-fragment');
      });
    });

    describe('IdP initiated login with active session', () => {
      const existingUsername = 'a@b.c';
      let existingSessionCookie: Cookie;

      beforeEach(async () => {
        const captureURLResponse = await supertest
          .get('/abc/xyz/handshake?one=two three')
          .expect(302);
        const captureURLCookie = request.cookie(captureURLResponse.headers['set-cookie'][0])!;

        const handshakeResponse = await supertest
          .get(`/api/security/saml/start?redirectURLFragment=${encodeURIComponent('#workpad')}`)
          .set('Cookie', captureURLCookie.cookieString())
          .expect(302);

        const handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
        const samlRequestId = await getSAMLRequestId(handshakeResponse.headers.location);

        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .send({
            SAMLResponse: await createSAMLResponse({
              inResponseTo: samlRequestId,
              username: existingUsername,
            }),
          })
          .expect(302);

        existingSessionCookie = request.cookie(
          samlAuthenticationResponse.headers['set-cookie'][0]
        )!;
      });

      it('should renew session and redirect to the home page if login is for the same user', async () => {
        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', existingSessionCookie.cookieString())
          .send({ SAMLResponse: await createSAMLResponse({ username: existingUsername }) })
          .expect('location', '/')
          .expect(302);

        const newSessionCookie = request.cookie(
          samlAuthenticationResponse.headers['set-cookie'][0]
        )!;
        expect(newSessionCookie.value).to.not.be.empty();
        expect(newSessionCookie.value).to.not.equal(existingSessionCookie.value);

        // Tokens from old cookie are invalidated.
        const rejectedResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', existingSessionCookie.cookieString())
          .expect(400);
        expect(rejectedResponse.body).to.have.property(
          'message',
          'Both access and refresh tokens are expired.'
        );

        // Only tokens from new session are valid.
        const acceptedResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', newSessionCookie.cookieString())
          .expect(200);
        expect(acceptedResponse.body).to.have.property('username', existingUsername);
      });

      it('should create a new session and redirect to the `overwritten_session` if login is for another user', async () => {
        const newUsername = 'c@d.e';
        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', existingSessionCookie.cookieString())
          .send({ SAMLResponse: await createSAMLResponse({ username: newUsername }) })
          .expect('location', '/overwritten_session')
          .expect(302);

        const newSessionCookie = request.cookie(
          samlAuthenticationResponse.headers['set-cookie'][0]
        )!;
        expect(newSessionCookie.value).to.not.be.empty();
        expect(newSessionCookie.value).to.not.equal(existingSessionCookie.value);

        // Tokens from old cookie are invalidated.
        const rejectedResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', existingSessionCookie.cookieString())
          .expect(400);
        expect(rejectedResponse.body).to.have.property(
          'message',
          'Both access and refresh tokens are expired.'
        );

        // Only tokens from new session are valid.
        const acceptedResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', newSessionCookie.cookieString())
          .expect(200);
        expect(acceptedResponse.body).to.have.property('username', newUsername);
      });
    });

    describe('handshake with very long URL path or fragment', () => {
      it('should not try to capture URL fragment if path is too big already', async () => {
        // 1. Initiate SAML handshake.
        const handshakeResponse = await supertest
          .get(`/abc/xyz/${'handshake'.repeat(10)}?one=two three`)
          .expect(302);
        const handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
        const redirectURL = url.parse(
          handshakeResponse.headers.location,
          true /* parseQueryString */
        );

        expect(redirectURL.href!.startsWith(`https://elastic.co/sso/saml`)).to.be(true);
        expect(redirectURL.query.SAMLRequest).to.not.be.empty();

        // 2. Finish SAML handshake
        const samlRequestId = await getSAMLRequestId(handshakeResponse.headers.location);
        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .send({ SAMLResponse: await createSAMLResponse({ inResponseTo: samlRequestId }) })
          .expect(302);

        // User should be redirected to the root URL since we couldn't even save URL path.
        expect(samlAuthenticationResponse.headers.location).to.be('/');

        await checkSessionCookie(
          request.cookie(samlAuthenticationResponse.headers['set-cookie'][0])!
        );
      });

      it('should capture only URL path if URL fragment is too big', async () => {
        // 1. Capture current path
        const captureURLResponse = await supertest
          .get('/abc/xyz/handshake?one=two three')
          .expect(302);
        const captureURLCookie = request.cookie(captureURLResponse.headers['set-cookie'][0])!;

        expect(captureURLResponse.headers.location).to.be(
          '/api/security/saml/capture-url-fragment'
        );

        // 2. Initiate SAML handshake.
        const handshakeResponse = await supertest
          .get(`/api/security/saml/start?redirectURLFragment=%23%2F${'workpad'.repeat(10)}`)
          .set('Cookie', captureURLCookie.cookieString())
          .expect(302);

        const handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
        const redirectURL = url.parse(
          handshakeResponse.headers.location,
          true /* parseQueryString */
        );

        expect(redirectURL.href!.startsWith(`https://elastic.co/sso/saml`)).to.be(true);
        expect(redirectURL.query.SAMLRequest).to.not.be.empty();

        // 3. Finish SAML handshake
        const samlRequestId = await getSAMLRequestId(handshakeResponse.headers.location);
        const samlAuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .send({ SAMLResponse: await createSAMLResponse({ inResponseTo: samlRequestId }) })
          .expect(302);

        // User should be redirected to the URL path that initiated SAML handshake.
        expect(samlAuthenticationResponse.headers.location).to.be(
          '/abc/xyz/handshake?one=two%20three'
        );

        await checkSessionCookie(
          request.cookie(samlAuthenticationResponse.headers['set-cookie'][0])!
        );
      });
    });
  });
}
