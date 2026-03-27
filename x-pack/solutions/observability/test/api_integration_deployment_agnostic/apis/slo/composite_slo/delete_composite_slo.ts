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

  describe('Delete Composite SLOs', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      await sloApi.deleteAllCompositeSlos(adminRoleAuthc);
    });

    afterEach(async () => {
      await sloApi.deleteAllCompositeSlos(adminRoleAuthc);
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    it('deletes a composite SLO', async () => {
      const created = await sloApi.createCompositeSlo(DEFAULT_COMPOSITE_SLO, adminRoleAuthc);

      await sloApi.deleteCompositeSlo(created.id, adminRoleAuthc);

      await sloApi.getCompositeSlo(created.id, adminRoleAuthc, 404);
    });

    it('returns 404 when deleting a non-existent composite SLO', async () => {
      await sloApi.deleteCompositeSlo('non-existent-id', adminRoleAuthc, 404);
    });

    it('only deletes the targeted composite SLO', async () => {
      const first = await sloApi.createCompositeSlo(
        { ...DEFAULT_COMPOSITE_SLO, name: 'First Composite' },
        adminRoleAuthc
      );
      const second = await sloApi.createCompositeSlo(
        { ...DEFAULT_COMPOSITE_SLO, name: 'Second Composite' },
        adminRoleAuthc
      );

      await sloApi.deleteCompositeSlo(first.id, adminRoleAuthc);

      await sloApi.getCompositeSlo(first.id, adminRoleAuthc, 404);

      const remaining = await sloApi.getCompositeSlo(second.id, adminRoleAuthc);
      expect(remaining.id).eql(second.id);
      expect(remaining.name).eql('Second Composite');
    });
  });
}
