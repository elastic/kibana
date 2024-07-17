/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

const API_BASE_PATH = '/internal/search_homepage';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;

  describe('Homepage routes', function () {
    describe('GET indices', function () {
      before(async () => {
        roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('viewer');
      });
      after(async () => {
        await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });
      it('has route', async () => {
        const { body } = await supertestWithoutAuth
          .get(`${API_BASE_PATH}/indices`)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(body.indices).toBeDefined();
        expect(Array.isArray(body.indices)).toBe(true);
      });
      it('accepts search_query', async () => {
        await supertestWithoutAuth
          .get(`${API_BASE_PATH}/indices`)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .query({ search_query: 'foo' })
          .expect(200);
      });
    });
  });
}
