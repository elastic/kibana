/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Cookie, cookie } from 'request';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const security = getService('security');
  const config = getService('config');
  const es = getService('es');

  const kibanaServerConfig = config.get('servers.kibana');
  const validUsername = kibanaServerConfig.username;
  const validPassword = kibanaServerConfig.password;

  const mockUserName = 'test-user';
  const mockUserPassword = 'test-password';

  describe('Users', () => {
    let sessionCookie: Cookie;
    before(async () => {
      const loginResponse = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({
          providerType: 'basic',
          providerName: 'basic',
          currentURL: '/',
          params: { username: validUsername, password: validPassword },
        })
        .expect(200);
      sessionCookie = cookie(loginResponse.headers['set-cookie'][0])!;
    });

    beforeEach(async () => {
      await security.user.create(mockUserName, { password: mockUserPassword, roles: [] });
    });

    afterEach(async () => {
      await security.user.delete(mockUserName);
    });

    it('should disable user', async () => {
      await supertest
        .post(`/internal/security/users/${mockUserName}/_disable`)
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .expect(204);

      const { body } = await es.security.getUser({ username: mockUserName });
      expect(body[mockUserName].enabled).to.be(false);
    });

    it('should enable user', async () => {
      await supertest
        .post(`/internal/security/users/${mockUserName}/_enable`)
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .expect(204);

      const { body } = await es.security.getUser({ username: mockUserName });
      expect(body[mockUserName].enabled).to.be(true);
    });
  });
}
