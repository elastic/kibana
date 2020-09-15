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
  const [username, password] = config.get('servers.elasticsearch.auth').split(':');

  async function checkSessionCookie(sessionCookie: Cookie, providerName: string) {
    const apiResponse = await supertest
      .get('/internal/security/me')
      .set('kbn-xsrf', 'xxx')
      .set('Cookie', sessionCookie.cookieString())
      .expect(200);

    expect(apiResponse.body.username).to.be(username);
    expect(apiResponse.body.authentication_provider).to.be(providerName);
  }

  async function getNumberOfSessionDocuments() {
    return (await es.search({ index: '.kibana_security_session*' })).hits.total.value;
  }

  // FLAKY: https://github.com/elastic/kibana/issues/76223
  describe.skip('Session Lifespan cleanup', () => {
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

    it('should properly clean up session expired because of lifespan', async function () {
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

      // Cleanup routine runs every 10s, let's wait for 30s to make sure it runs multiple times and
      // when lifespan is exceeded.
      await delay(30000);

      // Session info is removed from the index and cookie isn't valid anymore
      expect(await getNumberOfSessionDocuments()).to.be(0);
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .expect(401);
    });
  });
}
