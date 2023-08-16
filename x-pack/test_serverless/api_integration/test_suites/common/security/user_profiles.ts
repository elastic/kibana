/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { kibanaTestUser } from '@kbn/test';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlTools = getService('samlTools');

  describe('security/user_profiles', function () {
    describe('route access', () => {
      describe('internal', () => {
        it('update', async () => {
          const sessionCookie = await samlTools.login(kibanaTestUser.username);
          const { status } = await supertestWithoutAuth
            .post(`/internal/security/user_profile/_data`)
            .set(svlCommonApi.getInternalRequestHeader())
            .set('Cookie', sessionCookie.cookieString())
            .send({ key: 'value' });
          expect(status).not.toBe(404);
        });

        it('get current', async () => {
          const sessionCookie = await samlTools.login(kibanaTestUser.username);
          const { status } = await supertestWithoutAuth
            .get(`/internal/security/user_profile`)
            .set(svlCommonApi.getInternalRequestHeader())
            .set('Cookie', sessionCookie.cookieString());
          expect(status).not.toBe(404);
        });

        it('bulk get', async () => {
          const sessionCookie = await samlTools.login(kibanaTestUser.username);
          const { status } = await supertestWithoutAuth
            .get(`/internal/security/user_profile`)
            .set(svlCommonApi.getInternalRequestHeader())
            .set('Cookie', sessionCookie.cookieString())
            .send({ uids: ['12345678'] });
          expect(status).not.toBe(404);
        });
      });
    });
  });
}
