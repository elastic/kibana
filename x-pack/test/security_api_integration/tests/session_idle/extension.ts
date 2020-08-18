/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Cookie, cookie } from 'request';
import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const config = getService('config');

  const kibanaServerConfig = config.get('servers.kibana');
  const validUsername = kibanaServerConfig.username;
  const validPassword = kibanaServerConfig.password;

  describe('Session', () => {
    let sessionCookie: Cookie;

    const saveCookie = async (response: any) => {
      // save the response cookie, and pass back the result
      sessionCookie = cookie(response.headers['set-cookie'][0])!;
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
          providerName: 'basic',
          currentURL: '/',
          params: { username: validUsername, password: validPassword },
        })
        .expect(200)
        .then(saveCookie);
    });

    describe('GET /internal/security/session', () => {
      it('should return current session information', async () => {
        const { body } = await getSessionInfo();
        expect(body.now).to.be.a('number');
        expect(body.idleTimeoutExpiration).to.be.a('number');
        expect(body.lifespanExpiration).to.be(null);
        expect(body.provider).to.eql({ type: 'basic', name: 'basic' });
      });

      it('should not extend the session', async () => {
        const { body } = await getSessionInfo();
        const { body: body2 } = await getSessionInfo();
        expect(body2.now).to.be.greaterThan(body.now);
        expect(body2.idleTimeoutExpiration).to.equal(body.idleTimeoutExpiration);
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
        await extendSession();
        const { body: body2 } = await getSessionInfo();
        expect(body2.now).to.be.greaterThan(body.now);
        expect(body2.idleTimeoutExpiration).to.be.greaterThan(body.idleTimeoutExpiration);
      });
    });
  });
}
