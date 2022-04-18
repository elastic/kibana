/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie, Cookie } from 'tough-cookie';
import expect from '@kbn/expect';
import { adminTestUser } from '@kbn/test';
import type { AuthenticationProvider } from '@kbn/security-plugin/common/model';
import { getSAMLRequestId, getSAMLResponse } from '../../fixtures/saml/saml_tools';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const es = getService('es');
  const security = getService('security');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const config = getService('config');
  const randomness = getService('randomness');
  const kibanaServerConfig = config.get('servers.kibana');
  const notSuperuserTestUser = { username: 'test_user', password: 'changeme' };

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

  async function loginWithSAML() {
    const handshakeResponse = await supertest
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({ providerType: 'saml', providerName: 'saml1', currentURL: '' })
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

    const cookie = parseCookie(authenticationResponse.headers['set-cookie'][0])!;
    await checkSessionCookie(cookie, 'a@b.c', { type: 'saml', name: 'saml1' });
    return cookie;
  }

  async function loginWithBasic(credentials: { username: string; password: string }) {
    const authenticationResponse = await supertest
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({
        providerType: 'basic',
        providerName: 'basic1',
        currentURL: '/',
        params: credentials,
      })
      .expect(200);

    const cookie = parseCookie(authenticationResponse.headers['set-cookie'][0])!;
    await checkSessionCookie(cookie, credentials.username, { type: 'basic', name: 'basic1' });
    return cookie;
  }

  describe('Session Invalidate', () => {
    beforeEach(async () => {
      await es.cluster.health({ index: '.kibana_security_session*', wait_for_status: 'green' });
      await esDeleteAllIndices('.kibana_security_session*');
      await security.testUser.setRoles(['kibana_admin']);
    });

    it('should be able to invalidate all sessions at once', async function () {
      const basicSessionCookie = await loginWithBasic(notSuperuserTestUser);
      const samlSessionCookie = await loginWithSAML();

      // Invalidate all sessions and make sure neither of the sessions is active now.
      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(adminTestUser.username, adminTestUser.password)
        .send({ match: 'all' })
        .expect(200, { total: 2 });
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(401);
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', samlSessionCookie.cookieString())
        .expect(401);
    });

    it('should do nothing if specified provider type is not configured', async function () {
      const basicSessionCookie = await loginWithBasic(notSuperuserTestUser);
      const samlSessionCookie = await loginWithSAML();

      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(adminTestUser.username, adminTestUser.password)
        .send({ match: 'query', query: { provider: { type: 'oidc' } } })
        .expect(200, { total: 0 });
      await checkSessionCookie(basicSessionCookie, notSuperuserTestUser.username, {
        type: 'basic',
        name: 'basic1',
      });
      await checkSessionCookie(samlSessionCookie, 'a@b.c', { type: 'saml', name: 'saml1' });
    });

    it('should be able to invalidate session only for a specific provider type', async function () {
      const basicSessionCookie = await loginWithBasic(notSuperuserTestUser);
      const samlSessionCookie = await loginWithSAML();

      // Invalidate `basic` session and make sure that only `saml` session is still active.
      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(adminTestUser.username, adminTestUser.password)
        .send({ match: 'query', query: { provider: { type: 'basic' } } })
        .expect(200, { total: 1 });
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(401);
      await checkSessionCookie(samlSessionCookie, 'a@b.c', { type: 'saml', name: 'saml1' });

      // Invalidate `saml` session and make sure neither of the sessions is active now.
      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(adminTestUser.username, adminTestUser.password)
        .send({ match: 'query', query: { provider: { type: 'saml' } } })
        .expect(200, { total: 1 });
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', samlSessionCookie.cookieString())
        .expect(401);
    });

    it('should do nothing if specified provider name is not configured', async function () {
      const basicSessionCookie = await loginWithBasic(notSuperuserTestUser);
      const samlSessionCookie = await loginWithSAML();

      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(adminTestUser.username, adminTestUser.password)
        .send({ match: 'query', query: { provider: { type: 'basic', name: 'basic2' } } })
        .expect(200, { total: 0 });
      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(adminTestUser.username, adminTestUser.password)
        .send({ match: 'query', query: { provider: { type: 'saml', name: 'saml2' } } })
        .expect(200, { total: 0 });
      await checkSessionCookie(basicSessionCookie, notSuperuserTestUser.username, {
        type: 'basic',
        name: 'basic1',
      });
      await checkSessionCookie(samlSessionCookie, 'a@b.c', { type: 'saml', name: 'saml1' });
    });

    it('should be able to invalidate session only for a specific provider name', async function () {
      const basicSessionCookie = await loginWithBasic(notSuperuserTestUser);
      const samlSessionCookie = await loginWithSAML();

      // Invalidate `saml1` session and make sure that only `basic1` session is still active.
      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(adminTestUser.username, adminTestUser.password)
        .send({ match: 'query', query: { provider: { type: 'saml', name: 'saml1' } } })
        .expect(200, { total: 1 });
      await checkSessionCookie(basicSessionCookie, notSuperuserTestUser.username, {
        type: 'basic',
        name: 'basic1',
      });
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', samlSessionCookie.cookieString())
        .expect(401);

      // Invalidate `basic1` session and make sure neither of the sessions is active now.
      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(adminTestUser.username, adminTestUser.password)
        .send({ match: 'query', query: { provider: { type: 'basic', name: 'basic1' } } })
        .expect(200, { total: 1 });
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(401);
    });

    it('should do nothing if specified username does not have session', async function () {
      const basicSessionCookie = await loginWithBasic(notSuperuserTestUser);
      const samlSessionCookie = await loginWithSAML();

      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(adminTestUser.username, adminTestUser.password)
        .send({
          match: 'query',
          query: {
            provider: { type: 'basic', name: 'basic1' },
            username: `_${notSuperuserTestUser.username}`,
          },
        })
        .expect(200, { total: 0 });
      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(adminTestUser.username, adminTestUser.password)
        .send({
          match: 'query',
          query: { provider: { type: 'saml', name: 'saml1' }, username: '_a@b.c' },
        })
        .expect(200, { total: 0 });
      await checkSessionCookie(basicSessionCookie, notSuperuserTestUser.username, {
        type: 'basic',
        name: 'basic1',
      });
      await checkSessionCookie(samlSessionCookie, 'a@b.c', { type: 'saml', name: 'saml1' });
    });

    it('should be able to invalidate session only for a specific user', async function () {
      const basicSessionCookie = await loginWithBasic(notSuperuserTestUser);
      const samlSessionCookie = await loginWithSAML();

      // Invalidate session for `test_user` and make sure that only session of `a@b.c` is still active.
      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(adminTestUser.username, adminTestUser.password)
        .send({
          match: 'query',
          query: {
            provider: { type: 'basic', name: 'basic1' },
            username: notSuperuserTestUser.username,
          },
        })
        .expect(200, { total: 1 });
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(401);
      await checkSessionCookie(samlSessionCookie, 'a@b.c', { type: 'saml', name: 'saml1' });

      // Invalidate session for `a@b.c` and make sure neither of the sessions is active now.
      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(adminTestUser.username, adminTestUser.password)
        .send({
          match: 'query',
          query: { provider: { type: 'saml', name: 'saml1' }, username: 'a@b.c' },
        })
        .expect(200, { total: 1 });
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', samlSessionCookie.cookieString())
        .expect(401);
    });

    it('only super users should be able to invalidate sessions', async function () {
      const basicSessionCookie = await loginWithBasic(notSuperuserTestUser);
      const samlSessionCookie = await loginWithSAML();

      // User without a superuser role shouldn't be able to invalidate sessions.
      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(notSuperuserTestUser.username, notSuperuserTestUser.password)
        .send({ match: 'all' })
        .expect(403);
      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(notSuperuserTestUser.username, notSuperuserTestUser.password)
        .send({ match: 'query', query: { provider: { type: 'basic' } } })
        .expect(403);
      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(notSuperuserTestUser.username, notSuperuserTestUser.password)
        .send({
          match: 'query',
          query: { provider: { type: 'basic' }, username: notSuperuserTestUser.username },
        })
        .expect(403);

      await checkSessionCookie(basicSessionCookie, notSuperuserTestUser.username, {
        type: 'basic',
        name: 'basic1',
      });
      await checkSessionCookie(samlSessionCookie, 'a@b.c', { type: 'saml', name: 'saml1' });

      // With superuser role, it should be possible now.
      await security.testUser.setRoles(['superuser']);

      await supertest
        .post('/api/security/session/_invalidate')
        .set('kbn-xsrf', 'xxx')
        .auth(notSuperuserTestUser.username, notSuperuserTestUser.password)
        .send({ match: 'all' })
        .expect(200, { total: 2 });
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(401);
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', samlSessionCookie.cookieString())
        .expect(401);
    });
  });
}
