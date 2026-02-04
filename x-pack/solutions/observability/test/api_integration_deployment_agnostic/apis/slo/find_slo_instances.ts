/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { SUMMARY_DESTINATION_INDEX_NAME } from '@kbn/slo-plugin/common/constants';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { DEFAULT_SLO, TEST_SPACE_ID, createGroupedSummaryDoc } from './fixtures/slo';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const sloApi = getService('sloApi');
  const samlAuth = getService('samlAuth');

  let adminRoleAuthc: RoleCredentials;

  async function insertSummaryDocs(docs: any[]) {
    const operations = docs.flatMap((doc) => [
      { index: { _index: SUMMARY_DESTINATION_INDEX_NAME } },
      doc,
    ]);

    await esClient.bulk({
      refresh: 'wait_for',
      operations,
    });
  }

  async function cleanupSummaryDocs() {
    await esClient.deleteByQuery({
      index: SUMMARY_DESTINATION_INDEX_NAME,
      query: { match_all: {} },
      refresh: true,
      conflicts: 'proceed',
    });
  }

  describe('Find SLO Instances', function () {
    const GROUP_BY = ['host'];
    let sloId: string;

    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      const response = await sloApi.create({ ...DEFAULT_SLO, groupBy: 'host' }, adminRoleAuthc);
      sloId = response.id;
    });

    after(async () => {
      await cleanupSummaryDocs();
      await sloApi.deleteAllSLOs(adminRoleAuthc);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    afterEach(async () => {
      await cleanupSummaryDocs();
    });

    it('returns all instances for a given SLO id', async () => {
      const now = new Date().toISOString();
      const docs = [
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'instance-1' }, now),
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'instance-2' }, now),
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'instance-3' }, now),
        createGroupedSummaryDoc('other-slo', GROUP_BY, { host: 'instance-1' }, now),
      ];

      await insertSummaryDocs(docs);

      const response = await sloApi.findInstances(sloId, {}, adminRoleAuthc);

      // Filter out the temp instanceId '*'
      const actualInstances = response.results.filter((r) => r.instanceId !== '*');
      expect(actualInstances).to.have.length(3);
      expect(actualInstances.map((r) => r.instanceId).sort()).to.eql([
        'instance-1',
        'instance-2',
        'instance-3',
      ]);
    });

    it('filters instances by search term', async () => {
      const now = new Date().toISOString();
      const docs = [
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'admin-console.001' }, now),
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'admin-console.002' }, now),
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'user-service.001' }, now),
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'user-service.002' }, now),
      ];

      await insertSummaryDocs(docs);

      const response = await sloApi.findInstances(sloId, { search: 'admin' }, adminRoleAuthc);

      expect(response.results).to.have.length(2);
      expect(response.results.map((r) => r.instanceId).sort()).to.eql([
        'admin-console.001',
        'admin-console.002',
      ]);
    });

    it('returns 404 for non-existent SLO id', async () => {
      const now = new Date().toISOString();
      const docs = [createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'instance-1' }, now)];

      await insertSummaryDocs(docs);

      await sloApi.findInstances('non-existent-slo', {}, adminRoleAuthc, 404);
    });

    it('respects size parameter', async () => {
      const now = new Date().toISOString();
      const docs = [
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'instance-1' }, now),
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'instance-2' }, now),
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'instance-3' }, now),
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'instance-4' }, now),
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'instance-5' }, now),
      ];

      await insertSummaryDocs(docs);

      const response = await sloApi.findInstances(sloId, { size: '2' }, adminRoleAuthc);

      expect(response.results).to.have.length(2);
      expect(response.searchAfter).to.not.be(undefined);
    });

    it('supports pagination with searchAfter', async () => {
      const now = new Date().toISOString();
      const docs = [
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'instance-1' }, now),
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'instance-2' }, now),
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'instance-3' }, now),
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'instance-4' }, now),
      ];

      await insertSummaryDocs(docs);

      // First page
      const firstPage = await sloApi.findInstances(sloId, { size: '2' }, adminRoleAuthc);
      expect(firstPage.results).to.have.length(2);
      expect(firstPage.searchAfter).to.not.be(undefined);

      // Second page using searchAfter
      const secondPage = await sloApi.findInstances(
        sloId,
        { size: '2', searchAfter: firstPage.searchAfter },
        adminRoleAuthc
      );
      expect(secondPage.results).to.have.length(2);

      // Verify no duplicates between pages
      const firstPageIds = firstPage.results.map((r) => r.instanceId);
      const secondPageIds = secondPage.results.map((r) => r.instanceId);
      const allIds = [...firstPageIds, ...secondPageIds];
      expect(new Set(allIds).size).to.eql(4);
    });

    it('only returns instances for the current space', async () => {
      const now = new Date().toISOString();
      const docs = [
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'instance-1' }, now, TEST_SPACE_ID),
        createGroupedSummaryDoc(sloId, GROUP_BY, { host: 'instance-2' }, now, 'other-space'),
      ];

      await insertSummaryDocs(docs);

      const response = await sloApi.findInstances(sloId, {}, adminRoleAuthc);

      // Filter out the temp instanceId '*'
      const actualInstances = response.results.filter((r) => r.instanceId !== '*');
      expect(actualInstances).to.have.length(1);
      expect(actualInstances[0].instanceId).to.eql('instance-1');
    });
  });
}
