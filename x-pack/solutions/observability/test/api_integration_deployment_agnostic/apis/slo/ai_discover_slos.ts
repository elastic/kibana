/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const sloApi = getService('sloApi');
  const samlAuth = getService('samlAuth');

  let adminRoleAuthc: RoleCredentials;

  describe('AI Discover SLOs', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    it('returns an error when inference plugin is not configured', async () => {
      // The discover endpoint requires the inference plugin with a configured AI connector.
      // Without it, it should return a 400 indicating the feature is unavailable.
      const response = await sloApi.aiDiscover(adminRoleAuthc, undefined, 400);

      expect(response).to.have.property('message');
    });

    it('returns an error when a non-existent connector ID is provided', async () => {
      const response = await sloApi.aiDiscover(
        adminRoleAuthc,
        { connectorId: 'non-existent-connector-id' },
        400
      );

      expect(response).to.have.property('message');
    });

    it('rejects unauthenticated requests', async () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      await supertestWithoutAuth.post(`/internal/slo/ai/discover`).send().expect(401);
    });
  });
}
