/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie, Cookie } from 'tough-cookie';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import url from 'url';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import expect from '@kbn/expect';
import type { AuthenticationProvider } from '@kbn/security-plugin/common/model';
import { getStateAndNonce } from '../../fixtures/oidc/oidc_tools';
import {
  getMutualAuthenticationResponseToken,
  getSPNEGOToken,
} from '../../fixtures/kerberos/kerberos_tools';
import { getSAMLRequestId, getSAMLResponse } from '../../fixtures/saml/saml_tools';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const randomness = getService('randomness');
  const supertest = getService('supertestWithoutAuth');
  const config = getService('config');
  const security = getService('security');

  const kibanaServerConfig = config.get('servers.kibana');
  const validUsername = kibanaServerConfig.username;
  const validPassword = kibanaServerConfig.password;

  const CA_CERT = readFileSync(CA_CERT_PATH);
  const CLIENT_CERT = readFileSync(resolve(__dirname, '../../fixtures/pki/first_client.p12'));

  async function checkSessionCookie(
    sessionCookie: Cookie,
    username: string,
    provider: AuthenticationProvider,
    authenticationRealm: { name: string; type: string } | null,
    authenticationType: string
  ) {
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
      'authentication_type',
    ]);

    expect(apiResponse.body.username).to.be(username);
    expect(apiResponse.body.authentication_provider).to.eql(provider);
    if (authenticationRealm) {
      expect(apiResponse.body.authentication_realm).to.eql(authenticationRealm);
    }
    expect(apiResponse.body.authentication_type).to.be(authenticationType);
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
        .post('/internal/security/login')
        .ca(CA_CERT)
        .set('kbn-xsrf', 'xxx')
        .send({ providerType: 'saml', providerName: 'saml1', currentURL: 'https://kibana.com/' })
        .expect(200);

      // The cookie that includes some state of the in-progress authentication, that doesn't allow
      // to fully authenticate user yet.
      const intermediateAuthCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;

      // When login page is accessed directly.
      await supertest
        .get('/login')
        .ca(CA_CERT)
        .set('Cookie', intermediateAuthCookie.cookieString())
        .expect(200);

      // When user tries to access any other page in Kibana.
      const response = await supertest
        .get('/abc/xyz/handshake?one=two three')
        .ca(CA_CERT)
        .set('Cookie', intermediateAuthCookie.cookieString())
        .expect(302);
      expect(response.headers['set-cookie']).to.be(undefined);
      expect(response.headers.location).to.be(
        '/login?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2520three'
      );
    });

    it('preserves auth_provider_hint when accessing Kibana with intermediate authentication cookie', async () => {
      const handshakeResponse = await supertest
        .post('/internal/security/login')
        .ca(CA_CERT)
        .set('kbn-xsrf', 'xxx')
        .send({ providerType: 'saml', providerName: 'saml1', currentURL: 'https://kibana.com/' })
        .expect(200);

      // The cookie that includes some state of the in-progress authentication, that doesn't allow
      // to fully authenticate user yet.
      const intermediateAuthCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;

      // When user tries to access any other page in Kibana.
      const response = await supertest
        .get('/abc/xyz/handshake?one=two three&auth_provider_hint=saml1')
        .ca(CA_CERT)
        .set('Cookie', intermediateAuthCookie.cookieString())
        .expect(302);
      expect(response.headers['set-cookie']).to.be(undefined);
      expect(response.headers.location).to.be(
        '/login?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2520three%26auth_provider_hint%3Dsaml1&auth_provider_hint=saml1'
      );
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

          await checkSessionCookie(
            parseCookie(cookies[0])!,
            'a@b.c',
            { type: 'saml', name: providerName },
            { name: providerName, type: 'saml' },
            'token'
          );
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

          await checkSessionCookie(
            parseCookie(cookies[0])!,
            'a@b.c',
            { type: 'saml', name: providerName },
            { name: providerName, type: 'saml' },
            'token'
          );
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

          await checkSessionCookie(
            parseCookie(cookies[0])!,
            'a@b.c',
            { type: 'saml', name: providerName },
            { name: providerName, type: 'saml' },
            'token'
          );
        }
      });

      it('should be able to log in via IdP initiated login even if session with other provider type exists', async () => {
        for (const providerName of ['saml1', 'saml2']) {
          const basicAuthenticationResponse = await supertest
            .post('/internal/security/login')
            .ca(CA_CERT)
            .set('kbn-xsrf', 'xxx')
            .send({
              providerType: 'basic',
              providerName: 'basic1',
              currentURL: '/',
              params: { username: validUsername, password: validPassword },
            })
            .expect(200);

          const basicSessionCookie = parseCookie(
            basicAuthenticationResponse.headers['set-cookie'][0]
          )!;
          // Skip auth provider check since this comes from the reserved realm,
          // which is not available when running on ESS
          await checkSessionCookie(
            basicSessionCookie,
            'elastic',
            { type: 'basic', name: 'basic1' },
            null,
            'realm'
          );

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

          expect(authenticationResponse.headers.location).to.be(
            '/security/overwritten_session?next=%2F'
          );

          const cookies = authenticationResponse.headers['set-cookie'];
          expect(cookies).to.have.length(1);

          await checkSessionCookie(
            parseCookie(cookies[0])!,
            'a@b.c',
            { type: 'saml', name: providerName },
            { name: providerName, type: 'saml' },
            'token'
          );
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

        const saml1SessionCookie = parseCookie(
          saml1AuthenticationResponse.headers['set-cookie'][0]
        )!;
        await checkSessionCookie(
          saml1SessionCookie,
          'a@b.c',
          { type: 'saml', name: 'saml1' },
          { name: 'saml1', type: 'saml' },
          'token'
        );

        // And now try to login with `saml2`.
        const saml2AuthenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .ca(CA_CERT)
          .set('Cookie', saml1SessionCookie.cookieString())
          .send({
            SAMLResponse: await createSAMLResponse({ issuer: `http://www.elastic.co/saml2` }),
          })
          .expect(302);

        expect(saml2AuthenticationResponse.headers.location).to.be(
          '/security/overwritten_session?next=%2F'
        );

        const saml2SessionCookie = parseCookie(
          saml2AuthenticationResponse.headers['set-cookie'][0]
        )!;
        await checkSessionCookie(
          saml2SessionCookie,
          'a@b.c',
          { type: 'saml', name: 'saml2' },
          { name: 'saml2', type: 'saml' },
          'token'
        );
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

        const saml1SessionCookie = parseCookie(
          saml1AuthenticationResponse.headers['set-cookie'][0]
        )!;
        await checkSessionCookie(
          saml1SessionCookie,
          'a@b.c',
          { type: 'saml', name: 'saml1' },
          { name: 'saml1', type: 'saml' },
          'token'
        );

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

        expect(saml2AuthenticationResponse.headers.location).to.be(
          '/security/overwritten_session?next=%2Fapp%2Fkibana%23%2Fdashboards'
        );

        const saml2SessionCookie = parseCookie(
          saml2AuthenticationResponse.headers['set-cookie'][0]
        )!;
        await checkSessionCookie(
          saml2SessionCookie,
          'a@b.c',
          { type: 'saml', name: 'saml2' },
          { name: 'saml2', type: 'saml' },
          'token'
        );
      });

      // Ideally we should be able to abandon intermediate session and let user log in, but for the
      // time being we cannot distinguish errors coming from Elasticsearch for the case when SAML
      // response just doesn't correspond to request ID we have in intermediate cookie and the case
      // when something else has happened.
      it('should fail for IdP initiated login if intermediate session with other SAML provider exists', async () => {
        // First start authentication flow with `saml1`.
        const saml1HandshakeResponse = await supertest
          .post('/internal/security/login')
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

        const saml1HandshakeCookie = parseCookie(saml1HandshakeResponse.headers['set-cookie'][0])!;

        // And now try to login with `saml2`.
        const unauthenticatedResponse = await supertest
          .post('/api/security/saml/callback')
          .ca(CA_CERT)
          .set('Cookie', saml1HandshakeCookie.cookieString())
          .send({
            SAMLResponse: await createSAMLResponse({ issuer: `http://www.elastic.co/saml2` }),
          })
          .expect(401);

        expect(unauthenticatedResponse.headers['content-security-policy']).to.be(
          `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`
        );
        expect(unauthenticatedResponse.headers.refresh).to.be(
          `0;url=/logout?msg=UNAUTHENTICATED&next=%2F`
        );
      });

      it('should fail if SAML response is not valid', async () => {
        const unauthenticatedResponse = await supertest
          .post('/api/security/saml/callback')
          .ca(CA_CERT)
          .send({
            SAMLResponse: await createSAMLResponse({ inResponseTo: 'some-invalid-request-id' }),
          })
          .expect(401);

        expect(unauthenticatedResponse.headers['content-security-policy']).to.be(
          `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`
        );
        expect(unauthenticatedResponse.headers.refresh).to.be(
          `0;url=/login?msg=UNAUTHENTICATED&next=%2F`
        );
      });

      it('should be able to log in via SP initiated login with any configured realm', async () => {
        for (const providerName of ['saml1', 'saml2']) {
          const handshakeResponse = await supertest
            .post('/internal/security/login')
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

          const handshakeCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;
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

          await checkSessionCookie(
            parseCookie(cookies[0])!,
            'a@b.c',
            { type: 'saml', name: providerName },
            { name: providerName, type: 'saml' },
            'token'
          );
        }
      });

      it('should be able to log in via SP initiated login even if intermediate session with other SAML provider exists', async () => {
        // First start authentication flow with `saml1`.
        const saml1HandshakeResponse = await supertest
          .post('/internal/security/login')
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

        const saml1HandshakeCookie = parseCookie(saml1HandshakeResponse.headers['set-cookie'][0])!;

        // And now try to login with `saml2`.
        const saml2HandshakeResponse = await supertest
          .post('/internal/security/login')
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

        const saml2HandshakeCookie = parseCookie(saml2HandshakeResponse.headers['set-cookie'][0])!;

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

        const saml2SessionCookie = parseCookie(
          saml2AuthenticationResponse.headers['set-cookie'][0]
        )!;
        await checkSessionCookie(
          saml2SessionCookie,
          'a@b.c',
          { type: 'saml', name: 'saml2' },
          { name: 'saml2', type: 'saml' },
          'token'
        );
      });
    });

    describe('Kerberos', () => {
      it('should be able to log in from Login Selector', async () => {
        const spnegoResponse = await supertest
          .post('/internal/security/login')
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
          .post('/internal/security/login')
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
          parseCookie(cookies[0])!,
          'tester@TEST.ELASTIC.CO',
          { type: 'kerberos', name: 'kerberos1' },
          { name: 'kerb1', type: 'kerberos' },
          'token'
        );
      });

      it('should be able to log in from Login Selector even if client provides certificate and PKI is enabled', async () => {
        const spnegoResponse = await supertest
          .post('/internal/security/login')
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
          .post('/internal/security/login')
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
          parseCookie(cookies[0])!,
          'tester@TEST.ELASTIC.CO',
          { type: 'kerberos', name: 'kerberos1' },
          { name: 'kerb1', type: 'kerberos' },
          'token'
        );
      });
    });

    describe('OpenID Connect', () => {
      it('should be able to log in via IdP initiated login', async () => {
        const handshakeResponse = await supertest
          .get('/api/security/oidc/initiate_login?iss=https://test-op.elastic.co')
          .ca(CA_CERT)
          .expect(302);
        const handshakeCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;

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

        await checkSessionCookie(
          parseCookie(cookies[0])!,
          'user2',
          { type: 'oidc', name: 'oidc1' },
          { name: 'oidc1', type: 'oidc' },
          'token'
        );
      });

      it('should fail IdP initiated login if state is not matching', async () => {
        const handshakeResponse = await supertest
          .get('/api/security/oidc/initiate_login?iss=https://test-op.elastic.co')
          .ca(CA_CERT)
          .expect(302);
        const handshakeCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;

        const unauthenticatedResponse = await supertest
          .get('/api/security/oidc/callback?code=code2&state=someothervalue')
          .ca(CA_CERT)
          .set('Cookie', handshakeCookie.cookieString())
          .expect(401);

        expect(unauthenticatedResponse.headers['content-security-policy']).to.be(
          `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`
        );
        expect(unauthenticatedResponse.headers.refresh).to.be(
          `0;url=/logout?msg=UNAUTHENTICATED&next=%2F`
        );
      });

      it('should fail IdP initiated login if issuer is not known', async () => {
        const unauthenticatedResponse = await supertest
          .get('/api/security/oidc/initiate_login?iss=https://dummy.hacker.co')
          .ca(CA_CERT)
          .expect(401);

        expect(unauthenticatedResponse.headers['content-security-policy']).to.be(
          `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`
        );
        expect(unauthenticatedResponse.headers.refresh).to.be(
          `0;url=/login?msg=UNAUTHENTICATED&next=%2F`
        );
      });

      it('should be able to log in via SP initiated login', async () => {
        const handshakeResponse = await supertest
          .post('/internal/security/login')
          .ca(CA_CERT)
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'oidc',
            providerName: 'oidc1',
            currentURL: 'https://kibana.com/login?next=/abc/xyz/handshake?one=two%20three',
          })
          .expect(200);

        const handshakeCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;
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

        await checkSessionCookie(
          parseCookie(cookies[0])!,
          'user1',
          { type: 'oidc', name: 'oidc1' },
          { name: 'oidc1', type: 'oidc' },
          'token'
        );
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
          .post('/internal/security/login')
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

        await checkSessionCookie(
          parseCookie(cookies[0])!,
          'first_client',
          { type: 'pki', name: 'pki1' },
          { name: 'pki1', type: 'pki' },
          'token'
        );
      });
    });

    describe('Anonymous', () => {
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

      it('should be able to log in from Login Selector', async () => {
        const authenticationResponse = await supertest
          .post('/internal/security/login')
          .ca(CA_CERT)
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'anonymous',
            providerName: 'anonymous1',
            currentURL: 'https://kibana.com/login?next=/abc/xyz/handshake?one=two%20three#/workpad',
          })
          .expect(200);

        const cookies = authenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        await checkSessionCookie(
          parseCookie(cookies[0])!,
          'anonymous_user',
          { type: 'anonymous', name: 'anonymous1' },
          { name: 'native1', type: 'native' },
          'realm'
        );
      });

      it('should be able to log in from Login Selector even if client provides certificate and PKI is enabled', async () => {
        const authenticationResponse = await supertest
          .post('/internal/security/login')
          .ca(CA_CERT)
          .pfx(CLIENT_CERT)
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'anonymous',
            providerName: 'anonymous1',
            currentURL: 'https://kibana.com/login?next=/abc/xyz/handshake?one=two%20three#/workpad',
          })
          .expect(200);

        const cookies = authenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        await checkSessionCookie(
          parseCookie(cookies[0])!,
          'anonymous_user',
          { type: 'anonymous', name: 'anonymous1' },
          { name: 'native1', type: 'native' },
          'realm'
        );
      });
    });
  });
}
