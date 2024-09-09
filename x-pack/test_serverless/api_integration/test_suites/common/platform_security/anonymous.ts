/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('security/anonymous', function () {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });
    describe('route access', () => {
      describe('disabled', () => {
        it('get access capabilities', async () => {
          const { body, status } = await supertestWithoutAuth
            .get('/internal/security/anonymous_access/capabilities')
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get access state', async () => {
          const { body, status } = await supertestWithoutAuth
            .get('/internal/security/anonymous_access/state')
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
          svlCommonApi.assertApiNotFound(body, status);
        });
      });
    });
  });
}
