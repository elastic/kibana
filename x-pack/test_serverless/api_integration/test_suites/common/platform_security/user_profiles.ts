/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { kibanaTestUser } from '@kbn/test';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const samlTools = getService('samlTools');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;

  describe('security/user_profiles', function () {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('viewer');
    });
    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });
    describe('route access', () => {
      describe('internal', () => {
        // When we run tests on MKI, SAML realm is configured differently, and we cannot handcraft SAML responses to
        // log in as SAML users.
        this.tags(['skipMKI']);

        it('update', async () => {
          const { status } = await supertestWithoutAuth
            .post(`/internal/security/user_profile/_data`)
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .set(await samlTools.login(kibanaTestUser.username))
            .send({ key: 'value' });
          expect(status).not.toBe(404);
        });

        it('get current', async () => {
          const { status } = await supertestWithoutAuth
            .get(`/internal/security/user_profile`)
            .set(roleAuthc.apiKeyHeader)
            .set(svlCommonApi.getInternalRequestHeader())
            .set(await samlTools.login(kibanaTestUser.username));
          expect(status).not.toBe(404);
        });

        it('bulk get', async () => {
          const { status } = await supertestWithoutAuth
            .get(`/internal/security/user_profile`)
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .set(await samlTools.login(kibanaTestUser.username))
            .send({ uids: ['12345678'] });
          expect(status).not.toBe(404);
        });
      });
    });
  });
}
