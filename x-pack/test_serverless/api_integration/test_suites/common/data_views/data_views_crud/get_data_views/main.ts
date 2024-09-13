/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { dataViewConfig } from '../../constants';
import { RoleCredentials, InternalRequestHeader } from '../../../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('main', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });
    describe('get data views api', () => {
      it('returns list of data views', async () => {
        const response = await supertestWithoutAuth
          .get(dataViewConfig.basePath)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader);
        expect(response.status).to.be(200);
        expect(response.body).to.have.property(dataViewConfig.serviceKey);
        expect(response.body[dataViewConfig.serviceKey]).to.be.an('array');
      });
    });
  });
}
