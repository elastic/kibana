/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

const API_BASE_PATH = '/internal/serverless_search';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlUserManager = getService('svlUserManager');
  let roleAuthc: RoleCredentials;

  describe('Indices routes', function () {
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

        expect(body).toBeDefined();
      });
      it('accepts search_query', async () => {
        await supertestWithoutAuth
          .get(`${API_BASE_PATH}/indices`)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .query({ search_query: 'foo' })
          .expect(200);
      });
      it('accepts from & size', async () => {
        await supertestWithoutAuth
          .get(`${API_BASE_PATH}/indices`)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .query({ from: 0, size: 10 })
          .expect(200);
      });
    });
  });
}
