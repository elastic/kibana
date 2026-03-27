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

  describe('Update Composite SLOs', function () {
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

    it('updates the name of a composite SLO', async () => {
      const created = await sloApi.createCompositeSlo(DEFAULT_COMPOSITE_SLO, adminRoleAuthc);

      const updated = await sloApi.updateCompositeSlo(
        {
          compositeSloId: created.id,
          compositeSlo: { name: 'Updated Composite Name' },
        },
        adminRoleAuthc
      );

      expect(updated.id).eql(created.id);
      expect(updated.name).eql('Updated Composite Name');
      expect(updated.description).eql(DEFAULT_COMPOSITE_SLO.description);
      expect(updated.members).length(3);
    });

    it('updates the members of a composite SLO', async () => {
      const created = await sloApi.createCompositeSlo(DEFAULT_COMPOSITE_SLO, adminRoleAuthc);

      const newMembers = [
        { sloId: 'new-member-1', weight: 5 },
        { sloId: 'new-member-2', weight: 10 },
      ];

      const updated = await sloApi.updateCompositeSlo(
        {
          compositeSloId: created.id,
          compositeSlo: { members: newMembers },
        },
        adminRoleAuthc
      );

      expect(updated.id).eql(created.id);
      expect(updated.members).length(2);
      expect(updated.members[0].sloId).eql('new-member-1');
      expect(updated.members[0].weight).eql(5);
      expect(updated.members[1].sloId).eql('new-member-2');
      expect(updated.members[1].weight).eql(10);
    });

    it('updates tags and objective', async () => {
      const created = await sloApi.createCompositeSlo(DEFAULT_COMPOSITE_SLO, adminRoleAuthc);

      const updated = await sloApi.updateCompositeSlo(
        {
          compositeSloId: created.id,
          compositeSlo: { tags: ['new-tag'], objective: { target: 0.95 } },
        },
        adminRoleAuthc
      );

      expect(updated.tags).eql(['new-tag']);
      expect(updated.objective).eql({ target: 0.95 });
    });

    it('updates the enabled flag', async () => {
      const created = await sloApi.createCompositeSlo(DEFAULT_COMPOSITE_SLO, adminRoleAuthc);
      expect(created.enabled).eql(true);

      const updated = await sloApi.updateCompositeSlo(
        {
          compositeSloId: created.id,
          compositeSlo: { enabled: false },
        },
        adminRoleAuthc
      );

      expect(updated.enabled).eql(false);
    });

    it('returns 404 when updating a non-existent composite SLO', async () => {
      await sloApi.updateCompositeSlo(
        {
          compositeSloId: 'non-existent-id',
          compositeSlo: { name: 'Does not matter' },
        },
        adminRoleAuthc,
        404
      );
    });

    it('returns 400 when updating members to fewer than 2', async () => {
      const created = await sloApi.createCompositeSlo(DEFAULT_COMPOSITE_SLO, adminRoleAuthc);

      await sloApi.updateCompositeSlo(
        {
          compositeSloId: created.id,
          compositeSlo: { members: [{ sloId: 'only-one', weight: 1 }] },
        },
        adminRoleAuthc,
        400
      );
    });
  });
}
