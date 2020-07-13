/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import request, { Cookie } from 'request';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import url from 'url';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import expect from '@kbn/expect';
import { getStateAndNonce } from '../../oidc_api_integration/fixtures/oidc_tools';
import {
  getMutualAuthenticationResponseToken,
  getSPNEGOToken,
} from '../../kerberos_api_integration/fixtures/kerberos_tools';
import { getSAMLRequestId, getSAMLResponse } from '../../saml_api_integration/fixtures/saml_tools';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const randomness = getService('randomness');
  const supertest = getService('supertestWithoutAuth');
  const config = getService('config');

  const kibanaServerConfig = config.get('servers.kibana');
  const validUsername = kibanaServerConfig.username;
  const validPassword = kibanaServerConfig.password;

  const CA_CERT = readFileSync(CA_CERT_PATH);
  const CLIENT_CERT = readFileSync(
    resolve(__dirname, '../../pki_api_integration/fixtures/first_client.p12')
  );

  async function checkSessionCookie(sessionCookie: Cookie, username: string, providerName: string) {
    expect(sessionCookie.key).to.be('sid');
    expect(sessionCookie.value).to.not.be.empty();
    expect(sessionCookie.path).to.be('/');
    expect(sessionCookie.httpOnly).to.be(true);

    const apiResponse = await supertest
      .get('/internal/security/me')
      .ca(CA_CERT)
      .pfx(CLIENT_CERT)
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
    ]);

    expect(apiResponse.body.username).to.be(username);
    expect(apiResponse.body.authentication_provider).to.be(providerName);
  }

  describe('Login Selector', () => {
    it('should redirect user to a login selector', async () => {
      const response = await supertest
        .get('/abc/xyz/handshake?one=two three')
        .ca(CA_CERT)
        .expect(302);
      expect(response.headers['set-cookie']).to.be(undefined);
      expect(response.headers.location).to.be(
        '/login?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2520three'
      );
    });

    it('should allow access to login selector with intermediate authentication cookie', async () => {
      const handshakeResponse = await supertest
        .post('/internal/security/login_with')
        .ca(CA_CERT)
        .set('kbn-xsrf', 'xxx')
        .send({ providerType: 'saml', providerName: 'saml1', currentURL: 'https://kibana.com/' })
        .expect(200);

      // The cookie that includes some state of the in-progress authentication, that doesn't allow
      // to fully authenticate user yet.
      const intermediateAuthCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;

      await supertest
        .get('/login')
        .ca(CA_CERT)
        .set('Cookie', intermediateAuthCookie.cookieString())
        .expect(200);
    });

    describe('SAML', () => {
      function createSAMLResponse(options = {}) {
        return getSAMLResponse({
          destination: `http://localhost:${kibanaServerConfig.port}/api/security/saml/callback`,
          sessionIndex: String(randomness.naturalNumber()),
          ...options,
        });
      }

      it('should be able to log in via IdP initiated login for any configured provider', async () => {
        for (const providerName of ['saml1', 'saml2']) {
          const authenticationResponse = await supertest
            .post('/api/security/saml/callback')
            .ca(CA_CERT)
            .send({
              SAMLResponse: await createSAMLResponse({
                issuer: `http://www.elastic.co/${providerName}`,
              }),
            })
            .expect(302);

          // User should be redirected to the base URL.
          expect(authenticationResponse.headers.location).to.be('/');

          const cookies = authenticationResponse.headers['set-cookie'];
          expect(cookies).to.have.length(1);

          await checkSessionCookie(request.cookie(cookies[0])!, 'a@b.c', providerName);
        }
      });

      it('should redirect to URL from relay state in case of IdP initiated login only for providers that explicitly enabled that behaviour', async () => {
        for (const { providerName, redirectURL } of [
          { providerName: 'saml1', redirectURL: '/' },
          { providerName: 'saml2', redirectURL: '/app/kibana#/dashboards' },
        ]) {
          const authenticationResponse = await supertest
            .post('/api/security/saml/callback')
            .ca(CA_CERT)
            .type('form')
            .send({
              SAMLResponse: await createSAMLResponse({
                issuer: `http://www.elastic.co/${providerName}`,
              }),
            })
            .send({ RelayState: '/app/kibana#/dashboards' })
            .expect(302);

          // User should be redirected to the base URL.
          expect(authenticationResponse.headers.location).to.be(redirectURL);

          const cookies = authenticationResponse.headers['set-cookie'];
          expect(cookies).to.have.length(1);

          await checkSessionCookie(request.cookie(cookies[0])!, 'a@b.c', providerName);
        }
      });

      it('should not redirect to URL from relay state in case of IdP initiated login if URL is not internal', async () => {
        for (const providerName of ['saml1', 'saml2']) {
          const authenticationResponse = await supertest
            .post('/api/security/saml/callback')
            .ca(CA_CERT)
            .type('form')
            .send({
              SAMLResponse: await createSAMLResponse({
                issuer: `http://www.elastic.co/${providerName}`,
              }),
            })
            .send({ RelayState: 'http://www.elastic.co/app/kibana#/dashboards' })
            .expect(302);

          // User should be redirected to the base URL.
          expect(authenticationResponse.headers.location).to.be('/');

          const cookies = authenticationResponse.headers['set-cookie'];
          expect(cookies).to.have.length(1);

          await checkSessionCookie(request.cookie(cookies[0])!, 'a@b.c', providerName);
        }
      });

      it('should be able to log in via IdP initiated login even if session with other provider type exists', async () => {
        const basicAuthenticationResponse = await supertest
          .post('/internal/security/login')
          .ca(CA_CERT)
          .set('kbn-xsrf', 'xxx')
          .send({ username: validUsername, password: validPassword })
          .expect(204);

        const basicSessionCookie = request.cookie(
          basicAuthenticationResponse.headers['set-cookie'][0]
        )!;
        await checkSessionCookie(basicSessionCookie, 'elastic', 'basic1');

        for (const providerName of ['saml1', 'saml2']) {
          const authenticationResponse = await supertest
            .post('/api/security/saml/callback')
            .ca(CA_CERT)
            .set('Cookie', basicSessionCookie.cookieString())
            .send({
              SAMLResponse: await createSAMLResponse({
                issuer: `http://www.elastic.co/${providerName}`,
              }),
            })
            .expect(302);

          // It should be `/overwritten_session` instead of `/` once it's generalized.
          expect(authenticationResponse.headers.location).to.be('/');

          const cookies = authenticationResponse.headers['set-cookie'];
          expect(cookies).to.have.length(1);

          await checkSessionCookie(request.cookie(cookies[0])!, 'a@b.c', providerName);
        }
      });

      it('should be able to log in via IdP initiated login even if session with other SAML provider exists', async () => {
        // First login with `saml1`.
        const saml1AuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .ca(CA_CERT)
          .send({
            SAMLResponse: await createSAMLResponse({ issuer: `http://www.elastic.co/saml1` }),
          })
          .expect(302);

        const saml1SessionCookie = request.cookie(
          saml1AuthenticationResponse.headers['set-cookie'][0]
        )!;
        await checkSessionCookie(saml1SessionCookie, 'a@b.c', 'saml1');

        // And now try to login with `saml2`.
        const saml2AuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .ca(CA_CERT)
          .set('Cookie', saml1SessionCookie.cookieString())
          .send({
            SAMLResponse: await createSAMLResponse({ issuer: `http://www.elastic.co/saml2` }),
          })
          .expect(302);

        // It should be `/overwritten_session` instead of `/` once it's generalized.
        expect(saml2AuthenticationResponse.headers.location).to.be('/');

        const saml2SessionCookie = request.cookie(
          saml2AuthenticationResponse.headers['set-cookie'][0]
        )!;
        await checkSessionCookie(saml2SessionCookie, 'a@b.c', 'saml2');
      });

      it('should redirect to URL from relay state in case of IdP initiated login even if session with other SAML provider exists', async () => {
        // First login with `saml1`.
        const saml1AuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .ca(CA_CERT)
          .send({
            SAMLResponse: await createSAMLResponse({ issuer: `http://www.elastic.co/saml1` }),
          })
          .expect(302);

        const saml1SessionCookie = request.cookie(
          saml1AuthenticationResponse.headers['set-cookie'][0]
        )!;
        await checkSessionCookie(saml1SessionCookie, 'a@b.c', 'saml1');

        // And now try to login with `saml2`.
        const saml2AuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .ca(CA_CERT)
          .set('Cookie', saml1SessionCookie.cookieString())
          .type('form')
          .send({
            SAMLResponse: await createSAMLResponse({ issuer: `http://www.elastic.co/saml2` }),
          })
          .send({ RelayState: '/app/kibana#/dashboards' })
          .expect(302);

        // It should be `/overwritten_session` with `?next='/app/kibana#/dashboards'` instead of just
        // `'/app/kibana#/dashboards'` once it's generalized.
        expect(saml2AuthenticationResponse.headers.location).to.be('/app/kibana#/dashboards');

        const saml2SessionCookie = request.cookie(
          saml2AuthenticationResponse.headers['set-cookie'][0]
        )!;
        await checkSessionCookie(saml2SessionCookie, 'a@b.c', 'saml2');
      });

      // Ideally we should be able to abandon intermediate session and let user log in, but for the
      // time being we cannot distinguish errors coming from Elasticsearch for the case when SAML
      // response just doesn't correspond to request ID we have in intermediate cookie and the case
      // when something else has happened.
      it('should fail for IdP initiated login if intermediate session with other SAML provider exists', async () => {
        // First start authentication flow with `saml1`.
        const saml1HandshakeResponse = await supertest
          .post('/internal/security/login_with')
          .ca(CA_CERT)
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'saml',
            providerName: 'saml1',
            currentURL: 'https://kibana.com/login?next=/abc/xyz/handshake?one=two%20three#/workpad',
          })
          .expect(200);

        expect(
          saml1HandshakeResponse.body.location.startsWith(`https://elastic.co/sso/saml`)
        ).to.be(true);

        const saml1HandshakeCookie = request.cookie(
          saml1HandshakeResponse.headers['set-cookie'][0]
        )!;

        // And now try to login with `saml2`.
        await supertest
          .post('/api/security/saml/callback')
          .ca(CA_CERT)
          .set('Cookie', saml1HandshakeCookie.cookieString())
          .send({
            SAMLResponse: await createSAMLResponse({ issuer: `http://www.elastic.co/saml2` }),
          })
          .expect(401);
      });

      it('should be able to log in via SP initiated login with any configured realm', async () => {
        for (const providerName of ['saml1', 'saml2']) {
          const handshakeResponse = await supertest
            .post('/internal/security/login_with')
            .ca(CA_CERT)
            .set('kbn-xsrf', 'xxx')
            .send({
              providerType: 'saml',
              providerName,
              currentURL:
                'https://kibana.com/login?next=/abc/xyz/handshake?one=two%20three#/workpad',
            })
            .expect(200);

          expect(handshakeResponse.body.location.startsWith(`https://elastic.co/sso/saml`)).to.be(
            true
          );

          const handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
          const samlRequestId = await getSAMLRequestId(handshakeResponse.body.location);

          const authenticationResponse = await supertest
            .post('/api/security/saml/callback')
            .ca(CA_CERT)
            .set('kbn-xsrf', 'xxx')
            .set('Cookie', handshakeCookie.cookieString())
            .send({
              SAMLResponse: await createSAMLResponse({
                inResponseTo: samlRequestId,
                issuer: `http://www.elastic.co/${providerName}`,
              }),
            })
            .expect(302);

          // User should be redirected to the URL that initiated handshake.
          expect(authenticationResponse.headers.location).to.be(
            '/abc/xyz/handshake?one=two three#/workpad'
          );

          const cookies = authenticationResponse.headers['set-cookie'];
          expect(cookies).to.have.length(1);

          await checkSessionCookie(request.cookie(cookies[0])!, 'a@b.c', providerName);
        }
      });

      it('should be able to log in via SP initiated login even if intermediate session with other SAML provider exists', async () => {
        // First start authentication flow with `saml1`.
        const saml1HandshakeResponse = await supertest
          .post('/internal/security/login_with')
          .ca(CA_CERT)
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'saml',
            providerName: 'saml1',
            currentURL: 'https://kibana.com/login?next=/abc/xyz/handshake?one=two%20three#/saml1',
          })
          .expect(200);

        expect(
          saml1HandshakeResponse.body.location.startsWith(`https://elastic.co/sso/saml`)
        ).to.be(true);

        const saml1HandshakeCookie = request.cookie(
          saml1HandshakeResponse.headers['set-cookie'][0]
        )!;

        // And now try to login with `saml2`.
        const saml2HandshakeResponse = await supertest
          .post('/internal/security/login_with')
          .ca(CA_CERT)
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', saml1HandshakeCookie.cookieString())
          .send({
            providerType: 'saml',
            providerName: 'saml2',
            currentURL: 'https://kibana.com/login?next=/abc/xyz/handshake?one=two%20three#/saml2',
          })
          .expect(200);

        expect(
          saml2HandshakeResponse.body.location.startsWith(`https://elastic.co/sso/saml`)
        ).to.be(true);

        const saml2HandshakeCookie = request.cookie(
          saml2HandshakeResponse.headers['set-cookie'][0]
        )!;

        const saml2AuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .ca(CA_CERT)
          .set('Cookie', saml2HandshakeCookie.cookieString())
          .send({
            SAMLResponse: await createSAMLResponse({ issuer: `http://www.elastic.co/saml2` }),
          })
          .expect(302);

        expect(saml2AuthenticationResponse.headers.location).to.be(
          '/abc/xyz/handshake?one=two three#/saml2'
        );

        const saml2SessionCookie = request.cookie(
          saml2AuthenticationResponse.headers['set-cookie'][0]
        )!;
        await checkSessionCookie(saml2SessionCookie, 'a@b.c', 'saml2');
      });
    });

    describe('Kerberos', () => {
      it('should be able to log in from Login Selector', async () => {
        const spnegoResponse = await supertest
          .post('/internal/security/login_with')
          .ca(CA_CERT)
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'kerberos',
            providerName: 'kerberos1',
            currentURL: 'https://kibana.com/login?next=/abc/xyz/handshake?one=two%20three#/workpad',
          })
          .expect(401);

        expect(spnegoResponse.headers['set-cookie']).to.be(undefined);
        expect(spnegoResponse.headers['www-authenticate']).to.be('Negotiate');

        const authenticationResponse = await supertest
          .post('/internal/security/login_with')
          .ca(CA_CERT)
          .set('kbn-xsrf', 'xxx')
          .set('Authorization', `Negotiate ${getSPNEGOToken()}`)
          .send({
            providerType: 'kerberos',
            providerName: 'kerberos1',
            currentURL: 'https://kibana.com/login?next=/abc/xyz/handshake?one=two%20three#/workpad',
          })
          .expect(200);

        // Verify that mutual authentication works.
        expect(authenticationResponse.headers['www-authenticate']).to.be(
          `Negotiate ${getMutualAuthenticationResponseToken()}`
        );

        const cookies = authenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        await checkSessionCookie(
          request.cookie(cookies[0])!,
          'tester@TEST.ELASTIC.CO',
          'kerberos1'
        );
      });

      it('should be able to log in from Login Selector even if client provides certificate and PKI is enabled', async () => {
        const spnegoResponse = await supertest
          .post('/internal/security/login_with')
          .ca(CA_CERT)
          .pfx(CLIENT_CERT)
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'kerberos',
            providerName: 'kerberos1',
            currentURL: 'https://kibana.com/login?next=/abc/xyz/handshake?one=two%20three#/workpad',
          })
          .expect(401);

        expect(spnegoResponse.headers['set-cookie']).to.be(undefined);
        expect(spnegoResponse.headers['www-authenticate']).to.be('Negotiate');

        const authenticationResponse = await supertest
          .post('/internal/security/login_with')
          .ca(CA_CERT)
          .pfx(CLIENT_CERT)
          .set('kbn-xsrf', 'xxx')
          .set('Authorization', `Negotiate ${getSPNEGOToken()}`)
          .send({
            providerType: 'kerberos',
            providerName: 'kerberos1',
            currentURL: 'https://kibana.com/login?next=/abc/xyz/handshake?one=two%20three#/workpad',
          })
          .expect(200);

        // Verify that mutual authentication works.
        expect(authenticationResponse.headers['www-authenticate']).to.be(
          `Negotiate ${getMutualAuthenticationResponseToken()}`
        );

        const cookies = authenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        await checkSessionCookie(
          request.cookie(cookies[0])!,
          'tester@TEST.ELASTIC.CO',
          'kerberos1'
        );
      });
    });

    describe('OpenID Connect', () => {
      it('should be able to log in via IdP initiated login', async () => {
        const handshakeResponse = await supertest
          .get('/api/security/oidc/initiate_login?iss=https://test-op.elastic.co')
          .ca(CA_CERT)
          .expect(302);
        const handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;

        // Set the nonce in our mock OIDC Provider so that it can generate the ID Tokens
        const { state, nonce } = getStateAndNonce(handshakeResponse.headers.location);
        await supertest
          .post('/api/oidc_provider/setup')
          .ca(CA_CERT)
          .set('kbn-xsrf', 'xxx')
          .send({ nonce })
          .expect(200);

        const authenticationResponse = await supertest
          .get(`/api/security/oidc/callback?code=code2&state=${state}`)
          .ca(CA_CERT)
          .set('Cookie', handshakeCookie.cookieString())
          .expect(302);

        // User should be redirected to the base URL.
        expect(authenticationResponse.headers.location).to.be('/');

        const cookies = authenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        await checkSessionCookie(request.cookie(cookies[0])!, 'user2', 'oidc1');
      });

      it('should be able to log in via SP initiated login', async () => {
        const handshakeResponse = await supertest
          .post('/internal/security/login_with')
          .ca(CA_CERT)
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'oidc',
            providerName: 'oidc1',
            currentURL: 'https://kibana.com/login?next=/abc/xyz/handshake?one=two%20three',
          })
          .expect(200);

        const handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
        const redirectURL = url.parse(handshakeResponse.body.location, true /* parseQueryString */);
        expect(
          handshakeResponse.body.location.startsWith(
            `https://test-op.elastic.co/oauth2/v1/authorize`
          )
        ).to.be(true);

        expect(redirectURL.query.scope).to.not.be.empty();
        expect(redirectURL.query.response_type).to.not.be.empty();
        expect(redirectURL.query.client_id).to.not.be.empty();
        expect(redirectURL.query.redirect_uri).to.not.be.empty();
        expect(redirectURL.query.state).to.not.be.empty();
        expect(redirectURL.query.nonce).to.not.be.empty();

        // Set the nonce in our mock OIDC Provider so that it can generate the ID Tokens
        const { state, nonce } = redirectURL.query;
        await supertest
          .post('/api/oidc_provider/setup')
          .ca(CA_CERT)
          .set('kbn-xsrf', 'xxx')
          .send({ nonce })
          .expect(200);

        const authenticationResponse = await supertest
          .get(`/api/security/oidc/callback?code=code1&state=${state}`)
          .ca(CA_CERT)
          .set('Cookie', handshakeCookie.cookieString())
          .expect(302);

        // User should be redirected to the URL that initiated handshake.
        expect(authenticationResponse.headers.location).to.be('/abc/xyz/handshake?one=two three');

        const cookies = authenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        await checkSessionCookie(request.cookie(cookies[0])!, 'user1', 'oidc1');
      });
    });

    describe('PKI', () => {
      it('should redirect user to a login selector even if client provides certificate', async () => {
        const response = await supertest
          .get('/abc/xyz/handshake?one=two three')
          .ca(CA_CERT)
          .pfx(CLIENT_CERT)
          .expect(302);
        expect(response.headers['set-cookie']).to.be(undefined);
        expect(response.headers.location).to.be(
          '/login?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2520three'
        );
      });

      it('should be able to log in from Login Selector', async () => {
        const authenticationResponse = await supertest
          .post('/internal/security/login_with')
          .ca(CA_CERT)
          .pfx(CLIENT_CERT)
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'pki',
            providerName: 'pki1',
            currentURL: 'https://kibana.com/login?next=/abc/xyz/handshake?one=two%20three#/workpad',
          })
          .expect(200);

        const cookies = authenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        await checkSessionCookie(request.cookie(cookies[0])!, 'first_client', 'pki1');
      });
    });
  });
}
