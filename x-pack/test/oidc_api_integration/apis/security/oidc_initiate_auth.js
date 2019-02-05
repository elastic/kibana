/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from "expect.js";
import request from 'request';
import url from "url";
import { getStateAndNonce } from '../../fixtures/oidc_tools';


export default function ({ getService }) {
  const supertest = getService('supertestWithoutAuth');

  describe('OpenID Connect authentication', () => {
    it('should reject API requests if client is not authenticated', async () => {
      await supertest
        .get('/api/security/v1/me')
        .set('kbn-xsrf', 'xxx')
        .expect(401);
    });

    describe('initiating handshake', () => {
      it('should properly set cookie, return all parameters and redirect user', async () => {
        const handshakeResponse = await supertest.get('/abc/xyz/handshake?one=two three')
          .expect(302);

        const cookies = handshakeResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const handshakeCookie = request.cookie(cookies[0]);
        expect(handshakeCookie.key).to.be('sid');
        expect(handshakeCookie.value).to.not.be.empty();
        expect(handshakeCookie.path).to.be('/');
        expect(handshakeCookie.httpOnly).to.be(true);

        const redirectURL = url.parse(handshakeResponse.headers.location, true /* parseQueryString */);
        expect(redirectURL.href.startsWith(`https://elastic.co/oauth2/v1/authorize`)).to.be(true);
        expect(redirectURL.query.scope).to.not.be.empty();
        expect(redirectURL.query.response_type).to.not.be.empty();
        expect(redirectURL.query.client_id).to.not.be.empty();
        expect(redirectURL.query.redirect_uri).to.not.be.empty();
        expect(redirectURL.query.state).to.not.be.empty();
        expect(redirectURL.query.nonce).to.not.be.empty();
      });

      it('should properly set cookie, return all parameters and redirect user for Third Party initiated', async () => {
        const handshakeResponse = await supertest.get('/api/security/v1/oidc?iss=https://elastic.co')
          .expect(302);

        const cookies = handshakeResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const handshakeCookie = request.cookie(cookies[0]);
        expect(handshakeCookie.key).to.be('sid');
        expect(handshakeCookie.value).to.not.be.empty();
        expect(handshakeCookie.path).to.be('/');
        expect(handshakeCookie.httpOnly).to.be(true);

        const redirectURL = url.parse(handshakeResponse.headers.location, true /* parseQueryString */);
        expect(redirectURL.href.startsWith(`https://elastic.co/oauth2/v1/authorize`)).to.be(true);
        expect(redirectURL.query.scope).to.not.be.empty();
        expect(redirectURL.query.response_type).to.not.be.empty();
        expect(redirectURL.query.client_id).to.not.be.empty();
        expect(redirectURL.query.redirect_uri).to.not.be.empty();
        expect(redirectURL.query.state).to.not.be.empty();
        expect(redirectURL.query.nonce).to.not.be.empty();
      });

      it('should not allow access to the API', async () => {
        const handshakeResponse = await supertest.get('/abc/xyz/handshake?one=two three')
          .expect(302);

        const handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0]);
        await supertest
          .get('/api/security/v1/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .expect(401);
      });

      it('AJAX requests should not initiate handshake', async () => {
        const ajaxResponse = await supertest.get('/abc/xyz/handshake?one=two three')
          .set('kbn-xsrf', 'xxx')
          .expect(401);

        expect(ajaxResponse.headers['set-cookie']).to.be(undefined);
      });
    });

    describe('finishing handshake', () => {
      let stateValue;

      beforeEach(async () => {
        const handshakeResponse = await supertest.get('/abc/xyz/handshake?one=two three')
          .expect(302);

        stateValue = getStateAndNonce(handshakeResponse.headers.location).state;
      });

      it('should fail if OpenID Connect response is not complemented with handshake cookie', async () => {
        await supertest.get(`/api/security/v1/oidc?code=thisisthecode&state=${stateValue}`)
          .set('kbn-xsrf', 'xxx')
          .expect(401);
      });

      it('should fail if state is not matching', async () => {
        await supertest.get(`/api/security/v1/oidc?code=thisisthecode&state=someothervalue`)
          .set('kbn-xsrf', 'xxx')
          .expect(401);
      });
    });

    describe('logging out', () => {
      it('should redirect to home page if session cookie is not provided', async () => {
        const logoutResponse = await supertest.get('/api/security/v1/logout')
          .expect(302);

        expect(logoutResponse.headers['set-cookie']).to.be(undefined);
        expect(logoutResponse.headers.location).to.be('/');
      });
    });
  });
}
