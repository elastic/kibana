/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import request, { Cookie } from 'request';
import { delay } from 'bluebird';
import expect from '@kbn/expect';
import { ToolingLog } from '@kbn/dev-utils';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const es = getService('legacyEs');
  const config = getService('config');
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
    before(async () => {
      await es.cluster.health({ index: '.kibana_security_session*', waitForStatus: 'green' });
    });

    beforeEach(async () => {
      await es.deleteByQuery({
        index: '.kibana_security_session*',
        q: '*',
        waitForCompletion: true,
        refresh: true,
        ignore: [404],
      });
    });

    it('should properly clean up session expired because of idle timeout', async function () {
      this.timeout(180000);

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

      // Cleanup routine runs every 60s, let's wait for 120s to make sure it runs when idle timeout
      // threshold is exceeded.
      await delay(120000);

      // Session info is removed from the index and cookie isn't valid anymore
      expect(await getNumberOfSessionDocuments()).to.be(0);
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .expect(401);
    });

    it('should not clean up session if user is active', async function () {
      this.timeout(180000);

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

      // Run 15 consequent requests with 10s delay, during this time cleanup procedure should run at
      // least twice.
      const log = new ToolingLog({ level: 'info', writeTo: process.stdout });
      for (const counter of [...Array(15).keys()]) {
        // Session idle timeout is 15s, let's wait 10s and make a new request that would extend the session.
        await delay(10000);

        sessionCookie = await checkSessionCookie(sessionCookie, 'basic');
        log.info(`Session is still valid after ${(counter + 1) * 10}s`);
      }

      // Session document should still be present.
      expect(await getNumberOfSessionDocuments()).to.be(1);
    });
  });
}
