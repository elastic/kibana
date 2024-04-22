/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');

  describe('GET /api/console/es_config', () => {
    it('returns es host', async () => {
      const roleAuthc: RoleCredentials = await svlUserManager.createApiKeyForRole('admin');
      const { body } = await supertestWithoutAuth
        .get('/api/console/es_config')
        .set('kbn-xsrf', 'true')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(200);
      expect(body.host).to.be.ok();
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });
  });
}
