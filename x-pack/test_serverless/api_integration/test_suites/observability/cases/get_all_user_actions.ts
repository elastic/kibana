/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_USER_ACTIONS_URL } from '@kbn/cases-plugin/common/constants';
import type { RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const svlCases = getService('svlCases');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlCommonApi = getService('svlCommonApi');

  describe('get_all_user_actions', () => {
    let roleAuthc: RoleCredentials;

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    afterEach(async () => {
      await svlCases.api.deleteCases();
    });

    it('should fetch the status correctly with internal request headers', async () => {
      await supertestWithoutAuth
        .get(CASE_USER_ACTIONS_URL)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(200);
    });

    it('should not fetch the status correctly with no internal request headers', async () => {
      await supertestWithoutAuth.get(CASE_USER_ACTIONS_URL).set(roleAuthc.apiKeyHeader).expect(400);
    });
  });
};
