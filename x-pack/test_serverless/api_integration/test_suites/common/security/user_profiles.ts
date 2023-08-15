/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaTestUser } from '@kbn/test';
import expect from 'expect';
import { parse as parseCookie } from 'tough-cookie';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('security/user_profiles', function () {
    // ToDo: this test will need to change when we disable the login route
    // Use SAML callback?
    async function login() {
      const response = await supertestWithoutAuth
        .post('/internal/security/login')
        .set(svlCommonApi.getInternalRequestHeader())
        .send({
          providerType: 'basic',
          providerName: 'basic',
          currentURL: '/',
          params: { username: kibanaTestUser.username, password: kibanaTestUser.password },
        })
        .expect(200);
      return parseCookie(response.header['set-cookie'][0])!;
    }

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
