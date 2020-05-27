/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Cookie, cookie } from 'request';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const security = getService('security');

  const mockUserName = 'test-user';
  const mockUserPassword = 'test-password';

  describe('Change password', () => {
    let sessionCookie: Cookie;
    beforeEach(async () => {
      await security.user.create(mockUserName, { password: mockUserPassword, roles: [] });

      const loginResponse = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username: mockUserName, password: mockUserPassword })
        .expect(204);
      sessionCookie = cookie(loginResponse.headers['set-cookie'][0])!;
    });

    afterEach(async () => await security.user.delete(mockUserName));

    it('should reject password change if current password is wrong', async () => {
      const wrongPassword = `wrong-${mockUserPassword}`;
      const newPassword = `xxx-${mockUserPassword}-xxx`;

      await supertest
        .post(`/internal/security/users/${mockUserName}/password`)
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .send({ password: wrongPassword, newPassword })
        .expect(403);

      // Let's check that we can't login with wrong password, just in case.
      await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username: mockUserName, password: wrongPassword })
        .expect(401);

      // Let's check that we can't login with the password we were supposed to set.
      await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username: mockUserName, password: newPassword })
        .expect(401);

      // And can login with the current password.
      await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username: mockUserName, password: mockUserPassword })
        .expect(204);
    });

    it('should allow password change if current password is correct', async () => {
      const newPassword = `xxx-${mockUserPassword}-xxx`;

      const passwordChangeResponse = await supertest
        .post(`/internal/security/users/${mockUserName}/password`)
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .send({ password: mockUserPassword, newPassword })
        .expect(204);

      const newSessionCookie = cookie(passwordChangeResponse.headers['set-cookie'][0])!;

      // Let's check that previous cookie isn't valid anymore.
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .expect(401);

      // And that we can't login with the old password.
      await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username: mockUserName, password: mockUserPassword })
        .expect(401);

      // But new cookie should be valid.
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', newSessionCookie.cookieString())
        .expect(200);

      // And that we can login with new credentials.
      await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username: mockUserName, password: newPassword })
        .expect(204);
    });
  });
}
