/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { DEFAULT_COMPOSITE_SLO } from '../fixtures/slo';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const sloApi = getService('sloApi');
  const samlAuth = getService('samlAuth');

  let adminRoleAuthc: RoleCredentials;

  describe('Get Composite SLO', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      await sloApi.deleteAllCompositeSlos(adminRoleAuthc);
    });

    after(async () => {
      await sloApi.deleteAllCompositeSlos(adminRoleAuthc);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    it('retrieves a composite SLO by id', async () => {
      const created = await sloApi.createCompositeSlo(DEFAULT_COMPOSITE_SLO, adminRoleAuthc);

      const response = await sloApi.getCompositeSlo(created.id, adminRoleAuthc);

      expect(response.id).eql(created.id);
      expect(response.name).eql(DEFAULT_COMPOSITE_SLO.name);
      expect(response.description).eql(DEFAULT_COMPOSITE_SLO.description);
      expect(response.compositeMethod).eql('weightedAverage');
      expect(response.members).length(3);
      expect(response.objective).eql({ target: 0.99 });
      expect(response.timeWindow.type).eql('rolling');
      expect(response.tags).eql(['composite-test']);
      expect(response.enabled).eql(true);
    });

    it('returns 404 for a non-existent composite SLO', async () => {
      await sloApi.getCompositeSlo('non-existent-id', adminRoleAuthc, 404);
    });
  });
}
