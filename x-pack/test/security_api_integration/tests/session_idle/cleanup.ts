/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import request, { Cookie } from 'request';
import { delay } from 'bluebird';
import expect from '@kbn/expect';
import type { AuthenticationProvider } from '../../../../plugins/security/common/types';
import { getSAMLRequestId, getSAMLResponse } from '../../fixtures/saml/saml_tools';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const es = getService('legacyEs');
  const config = getService('config');
  const log = getService('log');
  const randomness = getService('randomness');
  const [basicUsername, basicPassword] = config.get('servers.elasticsearch.auth').split(':');
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

    return Array.isArray(apiResponse.headers['set-cookie'])
      ? request.cookie(apiResponse.headers['set-cookie'][0])!
      : undefined;
  }

  async function getNumberOfSessionDocuments() {
    return (((await es.search({ index: '.kibana_security_session*' })).hits.total as unknown) as {
      value: number;
    }).value;
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
      .set('Cookie', request.cookie(handshakeResponse.headers['set-cookie'][0])!.cookieString())
      .send({
        SAMLResponse: await getSAMLResponse({
          destination: `http://localhost:${kibanaServerConfig.port}/api/security/saml/callback`,
          sessionIndex: String(randomness.naturalNumber()),
          inResponseTo: await getSAMLRequestId(handshakeResponse.body.location),
        }),
      })
      .expect(302);

    const cookie = request.cookie(authenticationResponse.headers['set-cookie'][0])!;
    await checkSessionCookie(cookie, 'a@b.c', { type: 'saml', name: providerName });
    return cookie;
  }

  describe('Session Idle cleanup', () => {
    beforeEach(async () => {
      await es.cluster.health({ index: '.kibana_security_session*', waitForStatus: 'green' });
      await es.indices.delete({
        index: '.kibana_security_session*',
        ignore: [404],
      });
    });

    it('should properly clean up session expired because of idle timeout', async function () {
      this.timeout(60000);

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

      const sessionCookie = request.cookie(response.headers['set-cookie'][0])!;
      await checkSessionCookie(sessionCookie, basicUsername, { type: 'basic', name: 'basic1' });
      expect(await getNumberOfSessionDocuments()).to.be(1);

      // Cleanup routine runs every 10s, and idle timeout threshold is three times larger than 5s
      // idle timeout, let's wait for 30s to make sure cleanup routine runs when idle timeout
      // threshold is exceeded.
      await delay(30000);

      // Session info is removed from the index and cookie isn't valid anymore
      expect(await getNumberOfSessionDocuments()).to.be(0);
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .expect(401);
    });

    it('should properly clean up session expired because of idle timeout when providers override global session config', async function () {
      this.timeout(60000);

      const [
        samlDisableSessionCookie,
        samlOverrideSessionCookie,
        samlFallbackSessionCookie,
      ] = await Promise.all([
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

      const basicSessionCookie = request.cookie(response.headers['set-cookie'][0])!;
      await checkSessionCookie(basicSessionCookie, basicUsername, {
        type: 'basic',
        name: 'basic1',
      });
      expect(await getNumberOfSessionDocuments()).to.be(4);

      // Cleanup routine runs every 10s, and idle timeout threshold is three times larger than 5s
      // idle timeout, let's wait for 30s to make sure cleanup routine runs when idle timeout
      // threshold is exceeded.
      await delay(30000);

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

    it('should not clean up session if user is active', async function () {
      this.timeout(60000);

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

      let sessionCookie = request.cookie(response.headers['set-cookie'][0])!;
      await checkSessionCookie(sessionCookie, basicUsername, { type: 'basic', name: 'basic1' });
      expect(await getNumberOfSessionDocuments()).to.be(1);

      // Run 20 consequent requests with 1.5s delay, during this time cleanup procedure should run at
      // least twice.
      for (const counter of [...Array(20).keys()]) {
        // Session idle timeout is 15s, let's wait 10s and make a new request that would extend the session.
        await delay(1500);

        sessionCookie = (await checkSessionCookie(sessionCookie, basicUsername, {
          type: 'basic',
          name: 'basic1',
        }))!;
        log.debug(`Session is still valid after ${(counter + 1) * 1.5}s`);
      }

      // Session document should still be present.
      expect(await getNumberOfSessionDocuments()).to.be(1);
    });
  });
}
