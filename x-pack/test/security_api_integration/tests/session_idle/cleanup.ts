/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import request, { Cookie } from 'request';
import { delay } from 'bluebird';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const es = getService('legacyEs');
  const config = getService('config');
  const log = getService('log');
  const [username, password] = config.get('servers.elasticsearch.auth').split(':');

  async function checkSessionCookie(sessionCookie: Cookie, providerName: string) {
    const apiResponse = await supertest
      .get('/internal/security/me')
      .set('kbn-xsrf', 'xxx')
      .set('Cookie', sessionCookie.cookieString())
      .expect(200);

    expect(apiResponse.body.username).to.be(username);
    expect(apiResponse.body.authentication_provider).to.be(providerName);

    return request.cookie(apiResponse.headers['set-cookie'][0])!;
  }

  async function getNumberOfSessionDocuments() {
    return (await es.search({ index: '.kibana_security_session*' })).hits.total.value;
  }

  describe('Session Idle cleanup', () => {
    beforeEach(async () => {
      await es.cluster.health({ index: '.kibana_security_session*', waitForStatus: 'green' });
      await es.deleteByQuery({
        index: '.kibana_security_session*',
        q: '*',
        waitForCompletion: true,
        refresh: true,
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
          providerName: 'basic',
          currentURL: '/',
          params: { username, password },
        })
        .expect(200);

      const sessionCookie = request.cookie(response.headers['set-cookie'][0])!;
      await checkSessionCookie(sessionCookie, 'basic');
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

    it('should not clean up session if user is active', async function () {
      this.timeout(60000);

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

      let sessionCookie = request.cookie(response.headers['set-cookie'][0])!;
      await checkSessionCookie(sessionCookie, 'basic');
      expect(await getNumberOfSessionDocuments()).to.be(1);

      // Run 20 consequent requests with 1.5s delay, during this time cleanup procedure should run at
      // least twice.
      for (const counter of [...Array(20).keys()]) {
        // Session idle timeout is 15s, let's wait 10s and make a new request that would extend the session.
        await delay(1500);

        sessionCookie = await checkSessionCookie(sessionCookie, 'basic');
        log.debug(`Session is still valid after ${(counter + 1) * 1.5}s`);
      }

      // Session document should still be present.
      expect(await getNumberOfSessionDocuments()).to.be(1);
    });
  });
}
