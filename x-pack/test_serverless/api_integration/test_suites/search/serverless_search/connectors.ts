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
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;

  describe('Connectors routes', function () {
    describe('GET connectors', function () {
      before(async () => {
        roleAuthc = await svlUserManager.createApiKeyForRole('viewer');
      });
      after(async () => {
        await svlUserManager.invalidateApiKeyForRole(roleAuthc);
      });
      it('returns list of connectors', async () => {
        const { body } = await supertestWithoutAuth
          .get(`${API_BASE_PATH}/connectors`)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(body.connectors).toBeDefined();
        expect(Array.isArray(body.connectors)).toBe(true);
      });
    });
  });
}
