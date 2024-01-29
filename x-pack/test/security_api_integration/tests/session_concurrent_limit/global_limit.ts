/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie, Cookie } from 'tough-cookie';
import expect from '@kbn/expect';
import { adminTestUser } from '@kbn/test';
import type { AuthenticationProvider } from '@kbn/security-plugin/common';
import {
  getSAMLRequestId,
  getSAMLResponse,
} from '@kbn/security-api-integration-helpers/saml/saml_tools';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const es = getService('es');
  const security = getService('security');
  const config = getService('config');
  const log = getService('log');
  const randomness = getService('randomness');
  const kibanaServerConfig = config.get('servers.kibana');
  const testUser = { username: 'test_user', password: 'changeme' };
  const basicProvider = { type: 'basic', name: 'basic1' };
  const samlProvider = { type: 'saml', name: 'saml1' };
  const anonymousProvider = { type: 'anonymous', name: 'anonymous1' };

  async function checkSessionCookie(
    sessionCookie: Cookie,
    username: string,
    provider: AuthenticationProvider
  ) {
    const apiResponse = await supertest
      .get('/internal/security/me')
      .set('kbn-xsrf', 'xxx')
      .set('Cookie', sessionCookie.cookieString())
      .expect(200);

    expect(apiResponse.body.username).to.be(username);
    expect(apiResponse.body.authentication_provider).to.eql(provider);

    return Array.isArray(apiResponse.headers['set-cookie'])
      ? parseCookie(apiResponse.headers['set-cookie'][0])!
      : undefined;
  }

  async function checkSessionCookieInvalid(sessionCookie: Cookie) {
    await supertest
      .get('/internal/security/me')
      .set('kbn-xsrf', 'xxx')
      .set('Cookie', sessionCookie.cookieString())
      .expect(401);
  }

  async function loginWithSAML() {
    const handshakeResponse = await supertest
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({ providerType: samlProvider.type, providerName: samlProvider.name, currentURL: '' })
      .expect(200);

    const authenticationResponse = await supertest
      .post('/api/security/saml/callback')
      .set('kbn-xsrf', 'xxx')
      .set('Cookie', parseCookie(handshakeResponse.headers['set-cookie'][0])!.cookieString())
      .send({
        SAMLResponse: await getSAMLResponse({
          destination: `http://localhost:${kibanaServerConfig.port}/api/security/saml/callback`,
          sessionIndex: String(randomness.naturalNumber()),
          inResponseTo: await getSAMLRequestId(handshakeResponse.body.location),
        }),
      })
      .expect(302);

    return parseCookie(authenticationResponse.headers['set-cookie'][0])!;
  }

  async function loginWithBasic(credentials: { username: string; password: string }) {
    const authenticationResponse = await supertest
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({
        providerType: basicProvider.type,
        providerName: basicProvider.name,
        currentURL: '/',
        params: credentials,
      })
      .expect(200);

    return parseCookie(authenticationResponse.headers['set-cookie'][0])!;
  }

  async function loginWithAnonymous() {
    const authenticationResponse = await supertest
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({
        providerType: anonymousProvider.type,
        providerName: anonymousProvider.name,
        currentURL: '/',
      })
      .expect(200);

    return parseCookie(authenticationResponse.headers['set-cookie'][0])!;
  }

  async function toggleSessionCleanupTask(enabled: boolean) {
    await supertest
      .post('/session/toggle_cleanup_task')
      .set('kbn-xsrf', 'xxx')
      .auth(adminTestUser.username, adminTestUser.password)
      .send({ enabled })
      .expect(200);
  }

  describe('Session Global Concurrent Limit', () => {
    before(async function () {
      this.timeout(120000);
      // Disable cleanup task to not interfere with the tests.
      await toggleSessionCleanupTask(false);
      await security.user.create('anonymous_user', {
        password: 'changeme',
        roles: [],
        full_name: 'Guest',
      });
    });

    after(async () => {
      // Enable cleanup task again.
      await toggleSessionCleanupTask(true);
      await security.user.delete('anonymous_user');
    });

    beforeEach(async () => {
      await security.testUser.setRoles(['kibana_admin']);
      await es.indices.refresh({ index: '.kibana_security_session*' });
      await es.cluster.health({ index: '.kibana_security_session*', wait_for_status: 'green' });
      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(adminTestUser.username, adminTestUser.password)
        .send({ match: 'all' })
        .expect(200);
    });

    it('should properly enforce session limit with single provider', async function () {
      const basicSessionCookieOne = await loginWithBasic(testUser);
      await checkSessionCookie(basicSessionCookieOne, testUser.username, basicProvider);

      const basicSessionCookieTwo = await loginWithBasic(testUser);
      await checkSessionCookie(basicSessionCookieOne, testUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieTwo, testUser.username, basicProvider);

      // The oldest session should be displaced.
      const basicSessionCookieThree = await loginWithBasic(testUser);
      await es.indices.refresh({ index: '.kibana_security_session*' });
      await checkSessionCookieInvalid(basicSessionCookieOne);
      await checkSessionCookie(basicSessionCookieTwo, testUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieThree, testUser.username, basicProvider);

      // The next oldest session should be displaced as well.
      const basicSessionCookieFour = await loginWithBasic(testUser);
      await es.indices.refresh({ index: '.kibana_security_session*' });
      await checkSessionCookieInvalid(basicSessionCookieTwo);
      await checkSessionCookie(basicSessionCookieThree, testUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieFour, testUser.username, basicProvider);
    });

    it('should properly enforce session limit with single provider and multiple users', async function () {
      const basicSessionCookieOne = await loginWithBasic(testUser);
      const basicSessionCookieTwo = await loginWithBasic(testUser);
      const basicSessionCookieThree = await loginWithBasic(adminTestUser);
      const basicSessionCookieFour = await loginWithBasic(adminTestUser);

      // All sessions should be active.
      await checkSessionCookie(basicSessionCookieOne, testUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieTwo, testUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieThree, adminTestUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieFour, adminTestUser.username, basicProvider);

      // The oldest session of the admin user should be displaced.
      const basicSessionCookieFive = await loginWithBasic(adminTestUser);
      await es.indices.refresh({ index: '.kibana_security_session*' });
      await checkSessionCookie(basicSessionCookieOne, testUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieTwo, testUser.username, basicProvider);
      await checkSessionCookieInvalid(basicSessionCookieThree);
      await checkSessionCookie(basicSessionCookieFour, adminTestUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieFive, adminTestUser.username, basicProvider);

      // The next oldest session of the admin user should be displaced as well.
      const basicSessionCookieSix = await loginWithBasic(adminTestUser);
      await es.indices.refresh({ index: '.kibana_security_session*' });
      await checkSessionCookie(basicSessionCookieOne, testUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieTwo, testUser.username, basicProvider);
      await checkSessionCookieInvalid(basicSessionCookieFour);
      await checkSessionCookie(basicSessionCookieFive, adminTestUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieSix, adminTestUser.username, basicProvider);

      // Only the oldest session of the ordinary user should be displaced.
      const basicSessionCookieSeven = await loginWithBasic(testUser);
      await es.indices.refresh({ index: '.kibana_security_session*' });
      await checkSessionCookieInvalid(basicSessionCookieOne);
      await checkSessionCookie(basicSessionCookieTwo, testUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieFive, adminTestUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieSix, adminTestUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieSeven, testUser.username, basicProvider);
    });

    it('should properly enforce session limit even for multiple concurrent logins', async function () {
      const basicSessionCookies = await Promise.all(
        Array.from({ length: 10 }).map(() => loginWithBasic(testUser))
      );

      // Since logins were concurrent we cannot know upfront their `createdAt` timestamps and
      // hence which specific sessions will be outside the limit.
      const statusCodes = [];
      for (const basicSessionCookie of basicSessionCookies) {
        // This index refresh is only in the loop because Kibana might internally call
        // invalidate after it retrieved the session that's outside the limit
        await es.indices.refresh({ index: '.kibana_security_session*' });
        const { statusCode } = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', basicSessionCookie.cookieString());
        statusCodes.push(statusCode);
      }

      log.debug(`Collected status codes: ${JSON.stringify(statusCodes)}.`);

      expect(statusCodes.filter((statusCode) => statusCode === 200)).to.have.length(2);
      expect(statusCodes.filter((statusCode) => statusCode === 401)).to.have.length(8);
    });

    it('should properly enforce session limit with multiple providers', async function () {
      const basicSessionCookieOne = await loginWithBasic(testUser);
      const basicSessionCookieTwo = await loginWithBasic(testUser);

      const samlSessionCookieOne = await loginWithSAML();
      const samlSessionCookieTwo = await loginWithSAML();

      await es.indices.refresh({ index: '.kibana_security_session*' });

      // All sessions should be active.
      await checkSessionCookie(basicSessionCookieOne, testUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieTwo, testUser.username, basicProvider);
      await checkSessionCookie(samlSessionCookieOne, 'a@b.c', samlProvider);
      await checkSessionCookie(samlSessionCookieTwo, 'a@b.c', samlProvider);

      // Exceed limit with SAML credentials, other sessions shouldn't be affected.
      const samlSessionCookieThree = await loginWithSAML();
      await es.indices.refresh({ index: '.kibana_security_session*' });
      await checkSessionCookie(basicSessionCookieOne, testUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieTwo, testUser.username, basicProvider);
      await checkSessionCookieInvalid(samlSessionCookieOne);
      await checkSessionCookie(samlSessionCookieTwo, 'a@b.c', samlProvider);
      await checkSessionCookie(samlSessionCookieThree, 'a@b.c', samlProvider);

      // Exceed limit with Basic credentials, other sessions shouldn't be affected.
      const basicSessionCookieThree = await loginWithBasic(testUser);
      await es.indices.refresh({ index: '.kibana_security_session*' });
      await checkSessionCookieInvalid(basicSessionCookieOne);
      await checkSessionCookie(basicSessionCookieTwo, testUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieThree, testUser.username, basicProvider);
      await checkSessionCookie(samlSessionCookieTwo, 'a@b.c', samlProvider);
      await checkSessionCookie(samlSessionCookieThree, 'a@b.c', samlProvider);
    });

    it('should not enforce session limit for anonymous users', async function () {
      // All sessions should be active.
      for (const anonymousSessionCookie of [
        await loginWithAnonymous(),
        await loginWithAnonymous(),
        await loginWithAnonymous(),
        await loginWithAnonymous(),
      ]) {
        await es.indices.refresh({ index: '.kibana_security_session*' });
        await checkSessionCookie(anonymousSessionCookie, 'anonymous_user', anonymousProvider);
      }
    });
  });
}
