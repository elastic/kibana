/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_URL } from '@kbn/cases-plugin/common/constants';
import { CaseSeverity } from '@kbn/cases-plugin/common/types/domain';
import { ConnectorTypes } from '@kbn/cases-plugin/common/types/domain';
import type { RoleCredentials } from '../../../../shared/services';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');

  describe('post_case', () => {
    let roleAuthc: RoleCredentials;

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('viewer');
    });

    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('403 when trying to create case', async () => {
      await supertestWithoutAuth
        .post(CASES_URL)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          description: 'This is a brand new case of a bad meanie defacing data',
          title: 'Super Bad Observability Issue',
          tags: ['defacement'],
          severity: CaseSeverity.LOW,
          connector: {
            id: 'none',
            name: 'none',
            type: ConnectorTypes.none,
            fields: null,
          },
          settings: {
            syncAlerts: true,
          },
          owner: 'cases',
          assignees: [],
        })
        .expect(403);
    });
  });
};
