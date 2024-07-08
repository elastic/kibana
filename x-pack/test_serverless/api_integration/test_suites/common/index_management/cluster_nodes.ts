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
  const svlClusterNodesApi = getService('svlClusterNodesApi');
  const svlUserManager = getService('svlUserManager');

  let roleAuthc: RoleCredentials;

  describe('nodes', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
    });
    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });

    it('should NOT fetch the nodes plugins in serverless', async () => {
      const { body, status } = await svlClusterNodesApi.getNodesPlugins(roleAuthc);
      expect(status).to.eql(410);

      expect(Array.isArray(body)).to.be(false);
    });
  });
}
