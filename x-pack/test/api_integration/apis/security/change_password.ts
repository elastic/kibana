/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Cookie, cookie } from 'request';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');

  const mockUserName = 'test-user';
  const mockUserPassword = 'test-password';

  describe('Change password', () => {
    let sessionCookie: Cookie;
    beforeEach(async () => {
      // Create mock user to change password for.
      await getService('supertest')
        .post(`/api/security/v1/users/${mockUserName}`)
        .set('kbn-xsrf', 'xxx')
        .send({ username: mockUserName, password: mockUserPassword, roles: [] })
        .expect(200);

      const loginResponse = await supertest
        .post('/api/security/v1/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username: mockUserName, password: mockUserPassword })
        .expect(204);
      sessionCookie = cookie(loginResponse.headers['set-cookie'][0])!;
    });

    afterEach(async () => {
      // Remove mock user.
      await getService('supertest')
        .delete(`/api/security/v1/users/${mockUserName}`)
        .set('kbn-xsrf', 'xxx')
        .expect(204);
    });

    it('should reject password change if current password is wrong', async () => {
      const wrongPassword = `wrong-${mockUserPassword}`;
      const newPassword = `xxx-${mockUserPassword}-xxx`;

      await supertest
        .post(`/api/security/v1/users/${mockUserName}/password`)
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .send({ password: wrongPassword, newPassword })
        .expect(401);

      // Let's check that we can't login with wrong password (bug happen :shrug:).
      await supertest
        .post('/api/security/v1/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username: mockUserName, password: wrongPassword })
        .expect(401);

      // Let's check that we can't login with the password we were supposed to set.
      await supertest
        .post('/api/security/v1/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username: mockUserName, password: newPassword })
        .expect(401);

      // And can login with the current password.
      await supertest
        .post('/api/security/v1/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username: mockUserName, password: mockUserPassword })
        .expect(204);
    });

    it('should allow password change if current password is correct', async () => {
      const newPassword = `xxx-${mockUserPassword}-xxx`;

      const passwordChangeResponse = await supertest
        .post(`/api/security/v1/users/${mockUserName}/password`)
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .send({ password: mockUserPassword, newPassword })
        .expect(204);

      const newSessionCookie = cookie(passwordChangeResponse.headers['set-cookie'][0])!;

      // Let's check that previous cookie isn't valid anymore.
      await supertest
        .get('/api/security/v1/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .expect(401);

      // And that we can't login with the old password.
      await supertest
        .post('/api/security/v1/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username: mockUserName, password: mockUserPassword })
        .expect(401);

      // But new cookie should be valid.
      await supertest
        .get('/api/security/v1/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', newSessionCookie.cookieString())
        .expect(200);

      // And that we can login with new credentials.
      await supertest
        .post('/api/security/v1/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username: mockUserName, password: newPassword })
        .expect(204);
    });
  });
}
