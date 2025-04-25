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
import type { AuthenticationProvider } from '@kbn/security-plugin/common';
import {
  AggregateName,
  AggregationsMultiTermsAggregate,
  AggregationsMultiTermsBucket,
  AggregationsTopHitsAggregate,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/types';
import {
  getSAMLRequestId,
  getSAMLResponse,
} from '@kbn/security-api-integration-helpers/saml/saml_tools';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esSupertest = getService('esSupertest');
  const es = getService('es');
  const security = getService('security');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const config = getService('config');
  const retry = getService('retry');
  const log = getService('log');
  const randomness = getService('randomness');
  const testUser = { username: 'test_user', password: 'changeme' };
  const basicProvider = { type: 'basic', name: 'basic1' };
  const samlProvider = { type: 'saml', name: 'saml1' };
  const anonymousProvider = { type: 'anonymous', name: 'anonymous1' };
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

  async function getNumberOfSessionDocuments() {
    await es.indices.refresh({ index: '.kibana_security_session*' });

    const sessionDocuments = await es.search({ index: '.kibana_security_session*' });
    log.debug(`Existing sessions: ${JSON.stringify(sessionDocuments.hits)}.`);

    return (sessionDocuments.hits.total as SearchTotalHits).value;
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

  async function startSAMLHandshake() {
    const handshakeResponse = await supertest
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({ providerType: samlProvider.type, providerName: samlProvider.name, currentURL: '' })
      .expect(200);

    return {
      cookie: parseCookie(handshakeResponse.headers['set-cookie'][0])!,
      location: handshakeResponse.body.location,
    };
  }

  async function finishSAMLHandshake(handshakeCookie: Cookie, handshakeLocation: string) {
    const authenticationResponse = await supertest
      .post('/api/security/saml/callback')
      .set('kbn-xsrf', 'xxx')
      .set('Cookie', handshakeCookie.cookieString())
      .send({
        SAMLResponse: await getSAMLResponse({
          destination: `http://localhost:${kibanaServerConfig.port}/api/security/saml/callback`,
          sessionIndex: String(randomness.naturalNumber()),
          inResponseTo: await getSAMLRequestId(handshakeLocation),
        }),
      })
      .expect(302);

    return parseCookie(authenticationResponse.headers['set-cookie'][0])!;
  }

  async function loginWithSAML() {
    const { cookie, location } = await startSAMLHandshake();
    return finishSAMLHandshake(cookie, location);
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

  async function runCleanupTaskSoon() {
    // In most cases, an error would mean the task is currently running so let's run it again
    await retry.tryForTime(30000, async () => {
      await supertest
        .post('/session/_run_cleanup')
        .set('kbn-xsrf', 'xxx')
        .auth(adminTestUser.username, adminTestUser.password)
        .send()
        .expect(200);
    });
  }

  async function addESDebugLoggingSettings() {
    const addLogging = {
      persistent: {
        'logger.org.elasticsearch.xpack.security.authc': 'debug',
      },
    };
    await esSupertest.put('/_cluster/settings').send(addLogging).expect(200);
  }

  describe('Session Concurrent Limit cleanup', () => {
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

    beforeEach(async function () {
      this.timeout(120000);
      await es.cluster.health({ index: '.kibana_security_session*', wait_for_status: 'green' });
      await addESDebugLoggingSettings();
      await esDeleteAllIndices('.kibana_security_session*');
    });

    it('should properly clean up sessions that exceeded concurrent session limit', async function () {
      this.timeout(100000);

      log.debug(`Log in as ${testUser.username} 3 times with a 0.5s delay.`);

      const basicSessionCookieOne = await loginWithBasic(testUser);
      await setTimeoutAsync(500);
      const basicSessionCookieTwo = await loginWithBasic(testUser);
      await setTimeoutAsync(500);
      const basicSessionCookieThree = await loginWithBasic(testUser);

      log.debug('Waiting for all sessions to be persisted...');
      await retry.tryForTime(20000, async () => {
        expect(await getNumberOfSessionDocuments()).to.be(3);
      });

      // Poke the background task to run
      await runCleanupTaskSoon();
      log.debug('Waiting for cleanup job to run...');
      await retry.tryForTime(30000, async () => {
        // The oldest session should have been removed, but the rest should still be valid.
        expect(await getNumberOfSessionDocuments()).to.be(2);
      });

      await checkSessionCookieInvalid(basicSessionCookieOne);
      await checkSessionCookie(basicSessionCookieTwo, testUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieThree, testUser.username, basicProvider);
    });

    it('should properly clean up sessions that exceeded concurrent session limit even for multiple providers', async function () {
      this.timeout(160000);

      log.debug(`Log in as ${testUser.username} and SAML user 3 times each with a 0.5s delay.`);

      const basicSessionCookieOne = await loginWithBasic(testUser);
      await retry.tryForTime(20000, async () => {
        expect(await getNumberOfSessionDocuments()).to.be(1);
      });

      const samlSessionCookieOne = await loginWithSAML();
      await retry.tryForTime(20000, async () => {
        expect(await getNumberOfSessionDocuments()).to.be(2);
      });

      const basicSessionCookieTwo = await loginWithBasic(testUser);
      await retry.tryForTime(20000, async () => {
        expect(await getNumberOfSessionDocuments()).to.be(3);
      });

      const samlSessionCookieTwo = await loginWithSAML();
      await retry.tryForTime(20000, async () => {
        expect(await getNumberOfSessionDocuments()).to.be(4);
      });

      const basicSessionCookieThree = await loginWithBasic(testUser);
      await retry.tryForTime(20000, async () => {
        expect(await getNumberOfSessionDocuments()).to.be(5);
      });

      const samlSessionCookieThree = await loginWithSAML();

      log.debug('Waiting for all sessions to be persisted...');
      await retry.tryForTime(20000, async () => {
        expect(await getNumberOfSessionDocuments()).to.be(6);
      });

      // Poke the background task to run
      await runCleanupTaskSoon();
      log.debug('Waiting for cleanup job to run...');
      await retry.tryForTime(30000, async () => {
        // The oldest sessions should have been removed, but the rest should still be valid.
        expect(await getNumberOfSessionDocuments()).to.be(4);
      });

      await checkSessionCookieInvalid(basicSessionCookieOne);
      await checkSessionCookie(basicSessionCookieTwo, testUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieThree, testUser.username, basicProvider);

      await checkSessionCookieInvalid(samlSessionCookieOne);
      await checkSessionCookie(samlSessionCookieTwo, 'a@b.c', samlProvider);
      await checkSessionCookie(samlSessionCookieThree, 'a@b.c', samlProvider);
    });

    it('should properly clean up sessions that exceeded concurrent session limit when legacy sessions are present', async function () {
      this.timeout(100000);

      log.debug(`Log in as ${testUser.username} and SAML user 3 times each with a 0.5s delay.`);

      const basicSessionCookieOne = await loginWithBasic(testUser);
      await retry.tryForTime(20000, async () => {
        expect(await getNumberOfSessionDocuments()).to.be(1);
      });

      const samlSessionCookieOne = await loginWithSAML();
      await retry.tryForTime(20000, async () => {
        expect(await getNumberOfSessionDocuments()).to.be(2);
      });

      const basicSessionCookieTwo = await loginWithBasic(testUser);
      await retry.tryForTime(20000, async () => {
        expect(await getNumberOfSessionDocuments()).to.be(3);
      });

      const samlSessionCookieTwo = await loginWithSAML();
      await retry.tryForTime(20000, async () => {
        expect(await getNumberOfSessionDocuments()).to.be(4);
      });

      const basicSessionCookieThree = await loginWithBasic(testUser);
      await retry.tryForTime(20000, async () => {
        expect(await getNumberOfSessionDocuments()).to.be(5);
      });

      const samlSessionCookieThree = await loginWithSAML();

      log.debug('Waiting for all sessions to be persisted...');
      await retry.tryForTime(20000, async () => {
        expect(await getNumberOfSessionDocuments()).to.be(6);
      });

      // Remove `createdAt` field from the most recent sessions to emulate legacy sessions.
      // 1. Get the latest session for every unique credentials.
      const aggResponse = await es.search<
        unknown,
        Record<AggregateName, AggregationsMultiTermsAggregate>
      >({
        index: '.kibana_security_session*',
        size: 0,
        filter_path: 'aggregations.sessions.buckets.top.hits.hits._id',
        aggs: {
          sessions: {
            multi_terms: { terms: [{ field: 'usernameHash' }, { field: 'provider.type' }] },
            aggs: { top: { top_hits: { sort: [{ createdAt: { order: 'desc' } }], size: 1 } } },
          },
        },
      });

      // 2. Extract session IDs from the nested top_hits aggregation.
      const sessionIds =
        (aggResponse.aggregations?.sessions.buckets as AggregationsMultiTermsBucket[]).flatMap(
          (bucket) => {
            const sessionId = (bucket.top as AggregationsTopHitsAggregate).hits?.hits?.[0]?._id;
            return sessionId ? [sessionId] : [];
          }
        ) ?? [];
      expect(sessionIds.length).to.be(2);

      // 3. Remove `createdAt` field for the latest sessions emulating legacy sessions.
      await es.updateByQuery({
        index: '.kibana_security_session*',
        body: { script: 'ctx._source.remove("createdAt")', query: { ids: { values: sessionIds } } },
        refresh: true,
      });

      // Poke the background task to run
      await runCleanupTaskSoon();
      log.debug('Waiting for cleanup job to run...');
      await retry.tryForTime(30000, async () => {
        // The oldest session should have been removed, but the rest should still be valid.
        expect(await getNumberOfSessionDocuments()).to.be(4);
      });

      await checkSessionCookie(basicSessionCookieOne, testUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieTwo, testUser.username, basicProvider);
      await checkSessionCookieInvalid(basicSessionCookieThree);

      await checkSessionCookie(samlSessionCookieOne, 'a@b.c', samlProvider);
      await checkSessionCookie(samlSessionCookieTwo, 'a@b.c', samlProvider);
      await checkSessionCookieInvalid(samlSessionCookieThree);
    });

    it('should not clean up session if the limit is not exceeded', async function () {
      this.timeout(100000);

      log.debug(`Log in as ${testUser.username} 2 times with a 0.5s delay.`);

      const basicSessionCookieOne = await loginWithBasic(testUser);
      await setTimeoutAsync(500);
      const basicSessionCookieTwo = await loginWithBasic(testUser);

      log.debug('Waiting for all sessions to be persisted...');
      await retry.tryForTime(20000, async () => {
        expect(await getNumberOfSessionDocuments()).to.be(2);
      });

      // Poke the background task to run
      await runCleanupTaskSoon();
      log.debug('Waiting for cleanup job to run...');
      await retry.tryForTime(30000, async () => {
        // The oldest session should have been removed, but the rest should still be valid.
        expect(await getNumberOfSessionDocuments()).to.be(2);
      });

      await checkSessionCookie(basicSessionCookieOne, testUser.username, basicProvider);
      await checkSessionCookie(basicSessionCookieTwo, testUser.username, basicProvider);
    });

    it('should not clean up sessions of the anonymous users', async function () {
      this.timeout(100000);

      log.debug(`Log in as anonymous_user 3 times.`);

      const anonymousSessionCookieOne = await loginWithAnonymous();
      const anonymousSessionCookieTwo = await loginWithAnonymous();
      const anonymousSessionCookieThree = await loginWithAnonymous();

      log.debug('Waiting for all sessions to be persisted...');
      await retry.tryForTime(20000, async () => {
        expect(await getNumberOfSessionDocuments()).to.be(3);
      });

      // Poke the background task to run
      await runCleanupTaskSoon();
      log.debug('Waiting for cleanup job to run...');
      await retry.tryForTime(30000, async () => {
        // The oldest session should have been removed, but the rest should still be valid.
        expect(await getNumberOfSessionDocuments()).to.be(3);
      });

      // All sessions should be active.
      for (const anonymousSessionCookie of [
        anonymousSessionCookieOne,
        anonymousSessionCookieTwo,
        anonymousSessionCookieThree,
      ]) {
        await checkSessionCookie(anonymousSessionCookie, 'anonymous_user', anonymousProvider);
      }
    });

    it('should not clean up unauthenticated sessions', async function () {
      this.timeout(100000);

      log.debug(`Starting SAML handshake 3 times.`);

      const unauthenticatedSessionOne = await startSAMLHandshake();
      await setTimeoutAsync(500);
      const unauthenticatedSessionTwo = await startSAMLHandshake();
      await setTimeoutAsync(500);
      const unauthenticatedSessionThree = await startSAMLHandshake();
      await setTimeoutAsync(500);

      log.debug('Waiting for all sessions to be persisted...');
      await retry.tryForTime(20000, async () => {
        expect(await getNumberOfSessionDocuments()).to.be(3);
      });

      // Poke the background task to run
      await runCleanupTaskSoon();
      log.debug('Waiting for cleanup job to run...');
      await retry.tryForTime(30000, async () => {
        // The oldest session should have been removed, but the rest should still be valid.
        expect(await getNumberOfSessionDocuments()).to.be(3);
      });

      // Finish SAML handshake (all should succeed since we don't enforce limit at session creation time).
      const samlSessionCookieOne = await finishSAMLHandshake(
        unauthenticatedSessionOne.cookie,
        unauthenticatedSessionOne.location
      );
      await setTimeoutAsync(500); // Ensure the order of session cookie timestamps
      const samlSessionCookieTwo = await finishSAMLHandshake(
        unauthenticatedSessionTwo.cookie,
        unauthenticatedSessionTwo.location
      );
      await setTimeoutAsync(500); // Ensure the order of session cookie timestamps
      const samlSessionCookieThree = await finishSAMLHandshake(
        unauthenticatedSessionThree.cookie,
        unauthenticatedSessionThree.location
      );

      await es.indices.refresh({ index: '.kibana_security_session*' });

      // For authenticated sessions limit should be enforced
      await checkSessionCookieInvalid(samlSessionCookieOne);
      await checkSessionCookie(samlSessionCookieTwo, 'a@b.c', samlProvider);
      await checkSessionCookie(samlSessionCookieThree, 'a@b.c', samlProvider);
    });
  });
}
