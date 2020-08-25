/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import request, { Cookie } from 'request';
import url from 'url';
import { delay } from 'bluebird';
import { getStateAndNonce } from '../../fixtures/oidc_tools';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const config = getService('config');

  describe('OpenID Connect authentication', () => {
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
          providerName: 'basic',
          currentURL: '/',
          params: { username, password },
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).to.have.length(1);

      const { body: user } = await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', request.cookie(cookies[0])!.cookieString())
        .expect(200);

      expect(user.username).to.eql(username);
      expect(user.authentication_realm).to.eql({ name: 'reserved', type: 'reserved' });
      expect(user.authentication_provider).to.eql('basic');
      expect(user.authentication_type).to.be('realm');
    });

    describe('initiating handshake', () => {
      it('should redirect user to a page that would capture URL fragment', async () => {
        const handshakeResponse = await supertest
          .get('/abc/xyz/handshake?one=two three')
          .expect(302);

        expect(handshakeResponse.headers['set-cookie']).to.be(undefined);
        expect(handshakeResponse.headers.location).to.be(
          '/internal/security/capture-url?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2520three&providerType=oidc&providerName=oidc'
        );
      });

      it('should properly set cookie, return all parameters and redirect user', async () => {
        const handshakeResponse = await supertest
          .post('/internal/security/login')
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'oidc',
            providerName: 'oidc',
            currentURL:
              'https://kibana.com/internal/security/capture-url?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2520three&providerType=oidc&providerName=oidc#/workpad',
          })
          .expect(200);

        const cookies = handshakeResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const handshakeCookie = request.cookie(cookies[0])!;
        expect(handshakeCookie.key).to.be('sid');
        expect(handshakeCookie.value).to.not.be.empty();
        expect(handshakeCookie.path).to.be('/');
        expect(handshakeCookie.httpOnly).to.be(true);

        const redirectURL = url.parse(handshakeResponse.body.location, true /* parseQueryString */);
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

        const handshakeCookie = request.cookie(cookies[0])!;
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
          .post('/internal/security/login')
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'oidc',
            providerName: 'oidc',
            currentURL:
              'https://kibana.com/internal/security/capture-url?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2520three&providerType=oidc&providerName=oidc#/workpad',
          })
          .expect(200);

        const handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
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
          .post('/internal/security/login')
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'oidc',
            providerName: 'oidc',
            currentURL:
              'https://kibana.com/internal/security/capture-url?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2520three&providerType=oidc&providerName=oidc#/workpad',
          })
          .expect(200);

        handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
        stateAndNonce = getStateAndNonce(handshakeResponse.body.location);
        // Set the nonce in our mock OIDC Provider so that it can generate the ID Tokens
        await supertest
          .post('/api/oidc_provider/setup')
          .set('kbn-xsrf', 'xxx')
          .send({ nonce: stateAndNonce.nonce })
          .expect(200);
      });

      it('should fail if OpenID Connect response is not complemented with handshake cookie', async () => {
        await supertest
          .get(`/api/security/oidc/callback?code=thisisthecode&state=${stateAndNonce.state}`)
          .set('kbn-xsrf', 'xxx')
          .expect(401);
      });

      it('should fail if state is not matching', async () => {
        await supertest
          .get(`/api/security/oidc/callback?code=thisisthecode&state=someothervalue`)
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .expect(401);
      });

      it('should succeed if both the OpenID Connect response and the cookie are provided', async () => {
        const oidcAuthenticationResponse = await supertest
          .get(`/api/security/oidc/callback?code=code1&state=${stateAndNonce.state}`)
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .expect(302);

        // User should be redirected to the URL that initiated handshake.
        expect(oidcAuthenticationResponse.headers.location).to.be(
          '/abc/xyz/handshake?one=two%20three#/workpad'
        );

        const cookies = oidcAuthenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const sessionCookie = request.cookie(cookies[0])!;
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
        expect(apiResponse.body.authentication_provider).to.eql('oidc');
        expect(apiResponse.body.authentication_type).to.be('token');
      });
    });

    describe('Complete third party initiated authentication', () => {
      it('should authenticate a user when a third party initiates the authentication', async () => {
        const handshakeResponse = await supertest
          .get('/api/security/oidc/initiate_login?iss=https://test-op.elastic.co')
          .expect(302);
        const handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
        const stateAndNonce = getStateAndNonce(handshakeResponse.headers.location);

        // Set the nonce in our mock OIDC Provider so that it can generate the ID Tokens
        await supertest
          .post('/api/oidc_provider/setup')
          .set('kbn-xsrf', 'xxx')
          .send({ nonce: stateAndNonce.nonce })
          .expect(200);

        const oidcAuthenticationResponse = await supertest
          .get(`/api/security/oidc/callback?code=code2&state=${stateAndNonce.state}`)
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .expect(302);
        const cookies = oidcAuthenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const sessionCookie = request.cookie(cookies[0])!;
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
        expect(apiResponse.body.authentication_provider).to.eql('oidc');
        expect(apiResponse.body.authentication_type).to.be('token');
      });
    });

    describe('API access with active session', () => {
      let stateAndNonce: { state: string; nonce: string };
      let sessionCookie: Cookie;

      beforeEach(async () => {
        const handshakeResponse = await supertest
          .post('/internal/security/login')
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'oidc',
            providerName: 'oidc',
            currentURL:
              'https://kibana.com/internal/security/capture-url?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2520three&providerType=oidc&providerName=oidc#/workpad',
          })
          .expect(200);

        sessionCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
        stateAndNonce = getStateAndNonce(handshakeResponse.body.location);
        // Set the nonce in our mock OIDC Provider so that it can generate the ID Tokens
        await supertest
          .post('/api/oidc_provider/setup')
          .set('kbn-xsrf', 'xxx')
          .send({ nonce: stateAndNonce.nonce })
          .expect(200);

        const oidcAuthenticationResponse = await supertest
          .get(`/api/security/oidc/callback?code=code1&state=${stateAndNonce.state}`)
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(302);

        sessionCookie = request.cookie(oidcAuthenticationResponse.headers['set-cookie'][0])!;
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
          .post('/internal/security/login')
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'oidc',
            providerName: 'oidc',
            currentURL:
              'https://kibana.com/internal/security/capture-url?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2520three&providerType=oidc&providerName=oidc#/workpad',
          })
          .expect(200);

        const handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
        const stateAndNonce = getStateAndNonce(handshakeResponse.body.location);
        // Set the nonce in our mock OIDC Provider so that it can generate the ID Tokens
        await supertest
          .post('/api/oidc_provider/setup')
          .set('kbn-xsrf', 'xxx')
          .send({ nonce: stateAndNonce.nonce })
          .expect(200);

        const oidcAuthenticationResponse = await supertest
          .get(`/api/security/oidc/callback?code=code1&state=${stateAndNonce.state}`)
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .expect(302);

        const cookies = oidcAuthenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        sessionCookie = request.cookie(cookies[0])!;
      });

      it('should redirect to home page if session cookie is not provided', async () => {
        const logoutResponse = await supertest.get('/api/security/logout').expect(302);

        expect(logoutResponse.headers['set-cookie']).to.be(undefined);
        expect(logoutResponse.headers.location).to.be('/');
      });

      it('should redirect to the OPs endsession endpoint to complete logout', async () => {
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
          .post('/internal/security/login')
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'oidc',
            providerName: 'oidc',
            currentURL:
              'https://kibana.com/internal/security/capture-url?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2520three&providerType=oidc&providerName=oidc#/workpad',
          })
          .expect(200);

        const handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
        const stateAndNonce = getStateAndNonce(handshakeResponse.body.location);
        // Set the nonce in our mock OIDC Provider so that it can generate the ID Tokens
        await supertest
          .post('/api/oidc_provider/setup')
          .set('kbn-xsrf', 'xxx')
          .send({ nonce: stateAndNonce.nonce })
          .expect(200);

        const oidcAuthenticationResponse = await supertest
          .get(`/api/security/oidc/callback?code=code1&state=${stateAndNonce.state}`)
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .expect(302);

        const cookies = oidcAuthenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        sessionCookie = request.cookie(cookies[0])!;
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
        const handshakeResponse = await supertest
          .post('/internal/security/login')
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'oidc',
            providerName: 'oidc',
            currentURL:
              'https://kibana.com/internal/security/capture-url?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2520three&providerType=oidc&providerName=oidc#/workpad',
          })
          .expect(200);

        const handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
        const stateAndNonce = getStateAndNonce(handshakeResponse.body.location);
        // Set the nonce in our mock OIDC Provider so that it can generate the ID Tokens
        await supertest
          .post('/api/oidc_provider/setup')
          .set('kbn-xsrf', 'xxx')
          .send({ nonce: stateAndNonce.nonce })
          .expect(200);

        const oidcAuthenticationResponse = await supertest
          .get(`/api/security/oidc/callback?code=code1&state=${stateAndNonce.state}`)
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .expect(302);

        const cookies = oidcAuthenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        sessionCookie = request.cookie(cookies[0])!;
      });

      it('should properly set cookie and start new OIDC handshake', async function () {
        // Let's delete tokens from `.security-tokens` index directly to simulate the case when
        // Elasticsearch automatically removes access/refresh token document from the index
        // after some period of time.
        const esResponse = await getService('legacyEs').deleteByQuery({
          index: '.security-tokens',
          q: 'doc_type:token',
          refresh: true,
        });
        expect(esResponse).to.have.property('deleted').greaterThan(0);

        const handshakeResponse = await supertest
          .post('/internal/security/login')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .send({
            providerType: 'oidc',
            providerName: 'oidc',
            currentURL:
              'https://kibana.com/internal/security/capture-url?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2520three&providerType=oidc&providerName=oidc#/workpad',
          })
          .expect(200);

        const cookies = handshakeResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const handshakeCookie = request.cookie(cookies[0])!;
        expect(handshakeCookie.key).to.be('sid');
        expect(handshakeCookie.value).to.not.be.empty();
        expect(handshakeCookie.path).to.be('/');
        expect(handshakeCookie.httpOnly).to.be(true);

        const redirectURL = url.parse(handshakeResponse.body.location, true /* parseQueryString */);
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
