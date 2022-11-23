/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';
import { expect } from 'expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('Getting user profile for the current user', () => {
    const testUserName = 'user_with_profile';

    async function login() {
      const response = await supertestWithoutAuth
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({
          providerType: 'basic',
          providerName: 'basic',
          currentURL: '/',
          params: { username: testUserName, password: 'changeme' },
        })
        .expect(200);
      return parseCookie(response.headers['set-cookie'][0])!;
    }

    before(async () => {
      await security.user.create(testUserName, {
        password: 'changeme',
        roles: [`viewer`],
        full_name: 'User With Profile',
        email: 'user_with_profile@get_current_test',
      });
    });

    after(async () => {
      await security.user.delete(testUserName);
    });

    it('can get user profile for the current user', async () => {
      const sessionCookie = await login();

      await supertestWithoutAuth
        .post('/internal/security/user_profile/_data')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .send({ some: 'data', another: 'another-data' })
        .expect(200);

      const { body: profileWithoutData } = await supertestWithoutAuth
        .get('/internal/security/user_profile')
        .set('Cookie', sessionCookie.cookieString())
        .expect(200);
      const { body: profileWithAllData } = await supertestWithoutAuth
        .get('/internal/security/user_profile?dataPath=*')
        .set('Cookie', sessionCookie.cookieString())
        .expect(200);
      const { body: profileWithSomeData } = await supertestWithoutAuth
        .get('/internal/security/user_profile?dataPath=some')
        .set('Cookie', sessionCookie.cookieString())
        .expect(200);
      const { body: userWithProfileId } = await supertestWithoutAuth
        .get('/internal/security/me')
        .set('Cookie', sessionCookie.cookieString())
        .expect(200);

      // Profile UID is supposed to be stable.
      expectSnapshot(profileWithoutData).toMatchInline(`
        Object {
          "data": Object {},
          "enabled": true,
          "labels": Object {},
          "uid": "u_K1WXIRQbRoHiuJylXp842IEhAO_OdqT7SDHrJSzUIjU_0",
          "user": Object {
            "authentication_provider": Object {
              "name": "basic",
              "type": "basic",
            },
            "email": "user_with_profile@get_current_test",
            "full_name": "User With Profile",
            "realm_name": "default_native",
            "roles": Array [
              "viewer",
            ],
            "username": "user_with_profile",
          },
        }
      `);
      expectSnapshot(profileWithAllData).toMatchInline(`
        Object {
          "data": Object {
            "another": "another-data",
            "some": "data",
          },
          "enabled": true,
          "labels": Object {},
          "uid": "u_K1WXIRQbRoHiuJylXp842IEhAO_OdqT7SDHrJSzUIjU_0",
          "user": Object {
            "authentication_provider": Object {
              "name": "basic",
              "type": "basic",
            },
            "email": "user_with_profile@get_current_test",
            "full_name": "User With Profile",
            "realm_name": "default_native",
            "roles": Array [
              "viewer",
            ],
            "username": "user_with_profile",
          },
        }
      `);
      expectSnapshot(profileWithSomeData).toMatchInline(`
        Object {
          "data": Object {
            "some": "data",
          },
          "enabled": true,
          "labels": Object {},
          "uid": "u_K1WXIRQbRoHiuJylXp842IEhAO_OdqT7SDHrJSzUIjU_0",
          "user": Object {
            "authentication_provider": Object {
              "name": "basic",
              "type": "basic",
            },
            "email": "user_with_profile@get_current_test",
            "full_name": "User With Profile",
            "realm_name": "default_native",
            "roles": Array [
              "viewer",
            ],
            "username": "user_with_profile",
          },
        }
      `);
      expect(userWithProfileId.profile_uid).toBe('u_K1WXIRQbRoHiuJylXp842IEhAO_OdqT7SDHrJSzUIjU_0');
    });
  });
}
