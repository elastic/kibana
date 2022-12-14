/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie, Cookie } from 'tough-cookie';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const config = getService('config');
  const es = getService('es');

  const kibanaServerConfig = config.get('servers.kibana');
  const validUsername = kibanaServerConfig.username;
  const validPassword = kibanaServerConfig.password;

  // Get `createdAt` values from all existing sessions. It's the easiest solution
  // to check that the values weren't modified since we cannot get the specific
  // session id used during a test run, and we might have lots of unrelated
  // sessions in the index created by the tests that didn't clean up the index.
  async function getSessionsCreatedAt() {
    const searchResponse = await es.search<{ createdAt: number }>({
      index: '.kibana_security_session*',
    });

    return searchResponse.hits.hits.map((hit) => hit._source!.createdAt).sort();
  }

  describe('Session', () => {
    let sessionCookie: Cookie;

    const saveCookie = async (response: any) => {
      // save the response cookie, and pass back the result
      sessionCookie = parseCookie(response.headers['set-cookie'][0])!;
      return response;
    };
    const getSessionInfo = async () =>
      supertestWithoutAuth
        .get('/internal/security/session')
        .set('kbn-xsrf', 'xxx')
        .set('kbn-system-request', 'true')
        .set('Cookie', sessionCookie.cookieString())
        .send()
        .expect(200);
    const extendSession = async () =>
      supertestWithoutAuth
        .post('/internal/security/session')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .send()
        .expect(302)
        .then(saveCookie);

    beforeEach(async () => {
      await supertestWithoutAuth
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/',
          params: { username: validUsername, password: validPassword },
        })
        .expect(200)
        .then(saveCookie);
    });

    describe('GET /internal/security/session', () => {
      it('should return current session information', async () => {
        const { body } = await getSessionInfo();
        expect(body.expiresInMs).to.be.a('number');
        expect(body.canBeExtended).to.be(true);
        expect(body.provider).to.eql({ type: 'basic', name: 'basic1' });
      });

      it('should not extend the session', async () => {
        const { body } = await getSessionInfo();
        const { body: body2 } = await getSessionInfo();
        expect(body2.expiresInMs).to.be.lessThan(body.expiresInMs);
      });
    });

    describe('POST /internal/security/session', () => {
      it('should redirect to GET', async () => {
        const response = await extendSession();
        expect(response.headers.location).to.be('/internal/security/session');
      });

      it('should extend the session', async () => {
        // browsers will follow the redirect and return the new session info, but this testing framework does not
        // we simulate that behavior in this test by sending another GET request
        const { body } = await getSessionInfo();

        // Make sure that all sessions have populated `createdAt` field.
        const sessionsCreatedAtBeforeExtension = await getSessionsCreatedAt();
        expect(sessionsCreatedAtBeforeExtension.every((createdAt) => createdAt > 0)).to.be(true);

        await extendSession();
        const { body: body2 } = await getSessionInfo();
        expect(body2.expiresInMs).not.to.be.lessThan(body.expiresInMs);

        // Check that session extension didn't alter `createdAt`.
        expect(await getSessionsCreatedAt()).to.eql(sessionsCreatedAtBeforeExtension);
      });
    });
  });
}
