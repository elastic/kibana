/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { parse as parseCookie } from 'tough-cookie';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('security/user_profiles', function () {
    const testUserName = 'user_with_profile';

    // ToDo: this test will need to change when we disable the login route
    async function login() {
      const response = await supertestWithoutAuth
        .post('/internal/security/login')
        .set(svlCommonApi.getInternalRequestHeader())
        .send({
          providerType: 'basic',
          providerName: 'basic',
          currentURL: '/',
          params: { username: testUserName, password: 'changeme' },
        })
        .expect(200);
      return parseCookie(response.header['set-cookie'][0])!;
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

    describe('route access', () => {
      describe('internal', () => {
        it('update', async () => {
          const sessionCookie = await login();
          const { status } = await supertestWithoutAuth
            .post(`/internal/security/user_profile/_data`)
            .set(svlCommonApi.getInternalRequestHeader())
            .set('Cookie', sessionCookie.cookieString())
            .send({ key: 'value' });
          // Status should be 401, unauthorized
          expect(status).not.toBe(404);
        });

        it('get current', async () => {
          const sessionCookie = await login();
          const { status } = await supertestWithoutAuth
            .get(`/internal/security/user_profile`)
            .set(svlCommonApi.getInternalRequestHeader())
            .set('Cookie', sessionCookie.cookieString());
          // Status should be 401, unauthorized
          expect(status).not.toBe(404);
        });

        it('bulk get', async () => {
          const sessionCookie = await login();
          const { status } = await supertestWithoutAuth
            .get(`/internal/security/user_profile`)
            .set(svlCommonApi.getInternalRequestHeader())
            .set('Cookie', sessionCookie.cookieString())
            .send({ uids: ['12345678'] });
          // Status should be 401, unauthorized
          expect(status).not.toBe(404);
        });
      });
    });
  });
}
