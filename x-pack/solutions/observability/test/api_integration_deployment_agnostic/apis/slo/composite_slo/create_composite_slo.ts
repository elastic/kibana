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

  describe('Create Composite SLOs', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      await sloApi.deleteAllCompositeSlos(adminRoleAuthc);
    });

    after(async () => {
      await sloApi.deleteAllCompositeSlos(adminRoleAuthc);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    it('creates a composite SLO with required fields', async () => {
      const response = await sloApi.createCompositeSlo(DEFAULT_COMPOSITE_SLO, adminRoleAuthc);

      expect(response).property('id');
      expect(response.name).eql(DEFAULT_COMPOSITE_SLO.name);
      expect(response.description).eql(DEFAULT_COMPOSITE_SLO.description);
      expect(response.compositeMethod).eql('weightedAverage');
      expect(response.budgetingMethod).eql('occurrences');
      expect(response.objective).eql({ target: 0.99 });
      expect(response.timeWindow.type).eql('rolling');
      expect(response.members).length(3);
      expect(response.tags).eql(['composite-test']);
      expect(response.enabled).eql(true);
      expect(response).property('createdAt');
      expect(response).property('updatedAt');
      expect(response).property('createdBy');
      expect(response).property('updatedBy');
      expect(response).property('version');
    });

    it('creates a composite SLO with a custom id', async () => {
      const customId = 'my-custom-composite-id';
      const response = await sloApi.createCompositeSlo(
        { ...DEFAULT_COMPOSITE_SLO, id: customId },
        adminRoleAuthc
      );

      expect(response.id).eql(customId);
    });

    it('creates a composite SLO with enabled=false', async () => {
      const response = await sloApi.createCompositeSlo(
        { ...DEFAULT_COMPOSITE_SLO, enabled: false },
        adminRoleAuthc
      );

      expect(response).property('id');
      expect(response.enabled).eql(false);
    });

    it('creates a composite SLO with empty tags', async () => {
      const response = await sloApi.createCompositeSlo(
        { ...DEFAULT_COMPOSITE_SLO, tags: [] },
        adminRoleAuthc
      );

      expect(response).property('id');
      expect(response.tags).eql([]);
    });

    it('returns 400 when fewer than 2 members are provided', async () => {
      await sloApi.createCompositeSlo(
        {
          ...DEFAULT_COMPOSITE_SLO,
          members: [{ sloId: 'single-slo', weight: 1 }],
        },
        adminRoleAuthc,
        400
      );
    });

    it('returns 400 when a member has a non-positive weight', async () => {
      await sloApi.createCompositeSlo(
        {
          ...DEFAULT_COMPOSITE_SLO,
          members: [
            { sloId: 'slo-1', weight: 0 },
            { sloId: 'slo-2', weight: 1 },
          ],
        },
        adminRoleAuthc,
        400
      );
    });

    it('returns 400 when a member has a non-integer weight', async () => {
      await sloApi.createCompositeSlo(
        {
          ...DEFAULT_COMPOSITE_SLO,
          members: [
            { sloId: 'slo-1', weight: 1.5 },
            { sloId: 'slo-2', weight: 1 },
          ],
        },
        adminRoleAuthc,
        400
      );
    });
  });
}
