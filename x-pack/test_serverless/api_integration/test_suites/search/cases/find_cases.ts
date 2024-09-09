/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_URL } from '@kbn/cases-plugin/common/constants';
import type { RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');

  describe('find_cases', () => {
    let roleAuthc: RoleCredentials;

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('viewer');
    });

    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('403 when calling find cases API', async () => {
      await supertestWithoutAuth
        .get(`${CASES_URL}/_find`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(403);
    });
  });
};
