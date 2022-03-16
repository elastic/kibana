/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie, Cookie } from 'tough-cookie';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import expect from '@kbn/expect';
import { adminTestUser } from '@kbn/test';
import type { AuthenticationProvider } from '../../../../plugins/security/common/model';
import { getSAMLRequestId, getSAMLResponse } from '../../fixtures/saml/saml_tools';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const config = getService('config');
  const randomness = getService('randomness');
  const { username: basicUsername, password: basicPassword } = adminTestUser;
  const kibanaServerConfig = config.get('servers.kibana');

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
  }

  async function getNumberOfSessionDocuments() {
    return (
      // @ts-expect-error doesn't handle total as number
      (await es.search({ index: '.kibana_security_session*' })).hits.total.value as number
    );
  }

  async function loginWithSAML(providerName: string) {
    const handshakeResponse = await supertest
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({ providerType: 'saml', providerName, currentURL: '' })
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
    await checkSessionCookie(cookie, 'a@b.c', { type: 'saml', name: providerName });
    return cookie;
  }

  describe('Session Lifespan cleanup', () => {
    beforeEach(async () => {
      await es.cluster.health({ index: '.kibana_security_session*', wait_for_status: 'green' });
      await esDeleteAllIndices('.kibana_security_session*');
    });

    it('should properly clean up session expired because of lifespan', async function () {
      this.timeout(100000);

      const response = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/',
          params: { username: basicUsername, password: basicPassword },
        })
        .expect(200);

      const sessionCookie = parseCookie(response.headers['set-cookie'][0])!;
      await checkSessionCookie(sessionCookie, basicUsername, {
        type: 'basic',
        name: 'basic1',
      });
      expect(await getNumberOfSessionDocuments()).to.be(1);

      // Cleanup routine runs every 20s, let's wait for 60s to make sure it runs multiple times and
      // when lifespan is exceeded.
      await setTimeoutAsync(60000);

      // Session info is removed from the index and cookie isn't valid anymore
      expect(await getNumberOfSessionDocuments()).to.be(0);
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .expect(401);
    });

    it('should properly clean up session expired because of lifespan when providers override global session config', async function () {
      this.timeout(100000);

      const [samlDisableSessionCookie, samlOverrideSessionCookie, samlFallbackSessionCookie] =
        await Promise.all([
          loginWithSAML('saml_disable'),
          loginWithSAML('saml_override'),
          loginWithSAML('saml_fallback'),
        ]);

      const response = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/',
          params: { username: basicUsername, password: basicPassword },
        })
        .expect(200);
      const basicSessionCookie = parseCookie(response.headers['set-cookie'][0])!;
      await checkSessionCookie(basicSessionCookie, basicUsername, {
        type: 'basic',
        name: 'basic1',
      });
      expect(await getNumberOfSessionDocuments()).to.be(4);

      // Cleanup routine runs every 20s, let's wait for 40s to make sure it runs multiple times and
      // when lifespan is exceeded.
      await setTimeoutAsync(60000);

      // Session for basic and SAML that used global session settings should not be valid anymore.
      expect(await getNumberOfSessionDocuments()).to.be(2);
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(401);
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', samlFallbackSessionCookie.cookieString())
        .expect(401);

      // But sessions for the SAML with overridden and disabled lifespan should still be valid.
      await checkSessionCookie(samlOverrideSessionCookie, 'a@b.c', {
        type: 'saml',
        name: 'saml_override',
      });
      await checkSessionCookie(samlDisableSessionCookie, 'a@b.c', {
        type: 'saml',
        name: 'saml_disable',
      });
    });
  });
}
