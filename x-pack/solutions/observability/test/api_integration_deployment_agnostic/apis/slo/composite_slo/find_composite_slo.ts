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

  describe('Find Composite SLOs', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      await sloApi.deleteAllCompositeSlos(adminRoleAuthc);

      await sloApi.createCompositeSlo(
        { ...DEFAULT_COMPOSITE_SLO, name: 'Composite Alpha', tags: ['team-a'] },
        adminRoleAuthc
      );
      await sloApi.createCompositeSlo(
        { ...DEFAULT_COMPOSITE_SLO, name: 'Composite Beta', tags: ['team-b'] },
        adminRoleAuthc
      );
      await sloApi.createCompositeSlo(
        { ...DEFAULT_COMPOSITE_SLO, name: 'Composite Gamma', tags: ['team-a', 'team-b'] },
        adminRoleAuthc
      );
    });

    after(async () => {
      await sloApi.deleteAllCompositeSlos(adminRoleAuthc);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    it('returns all composite SLOs with default pagination', async () => {
      const response = await sloApi.findCompositeSlos(adminRoleAuthc);

      expect(response.total).eql(3);
      expect(response.page).eql(1);
      expect(response.perPage).eql(25);
      expect(response.results).length(3);
    });

    it('paginates results', async () => {
      const page1 = await sloApi.findCompositeSlos(adminRoleAuthc, {
        page: '1',
        perPage: '2',
      });

      expect(page1.total).eql(3);
      expect(page1.page).eql(1);
      expect(page1.perPage).eql(2);
      expect(page1.results).length(2);

      const page2 = await sloApi.findCompositeSlos(adminRoleAuthc, {
        page: '2',
        perPage: '2',
      });

      expect(page2.total).eql(3);
      expect(page2.page).eql(2);
      expect(page2.perPage).eql(2);
      expect(page2.results).length(1);
    });

    it('filters by tags', async () => {
      const response = await sloApi.findCompositeSlos(adminRoleAuthc, {
        tags: 'team-a',
      });

      expect(response.total).eql(2);
      for (const result of response.results) {
        expect(result.tags).to.contain('team-a');
      }
    });

    it('searches by name', async () => {
      const response = await sloApi.findCompositeSlos(adminRoleAuthc, {
        search: 'Alpha',
      });

      expect(response.total).eql(1);
      expect(response.results[0].name).eql('Composite Alpha');
    });

    it('sorts by name ascending', async () => {
      const response = await sloApi.findCompositeSlos(adminRoleAuthc, {
        sortBy: 'name',
        sortDirection: 'asc',
      });

      expect(response.results[0].name).eql('Composite Alpha');
      expect(response.results[1].name).eql('Composite Beta');
      expect(response.results[2].name).eql('Composite Gamma');
    });

    it('sorts by name descending', async () => {
      const response = await sloApi.findCompositeSlos(adminRoleAuthc, {
        sortBy: 'name',
        sortDirection: 'desc',
      });

      expect(response.results[0].name).eql('Composite Gamma');
      expect(response.results[1].name).eql('Composite Beta');
      expect(response.results[2].name).eql('Composite Alpha');
    });

    it('returns empty results when no composites match search', async () => {
      const response = await sloApi.findCompositeSlos(adminRoleAuthc, {
        search: 'zzz-no-match-xyz',
      });

      expect(response.total).eql(0);
      expect(response.results).length(0);
    });
  });
}
