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

  describe('Find SLO Groupings', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      await sloApi.deleteAllSLOs(adminRoleAuthc);
    });

    after(async () => {
      await sloApi.deleteAllSLOs(adminRoleAuthc);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    afterEach(async () => {
      await cleanupSummaryDocs();
    });

    describe('validation errors', () => {
      it('returns 400 when querying an ungrouped SLO', async () => {
        const slo = await sloApi.create({ ...DEFAULT_SLO, groupBy: '*' }, adminRoleAuthc);

        const response = await sloApi.findGroupings(
          slo.id,
          { instanceId: '*', groupingKey: 'host' },
          adminRoleAuthc,
          400
        );

        expect(response).to.have.property('message');
        expect((response as any).message).to.contain(
          'Ungrouped SLO cannot be queried for available groupings'
        );
      });

      it("returns 400 when groupingKey doesn't match SLO's groupBy field", async () => {
        const slo = await sloApi.create(
          { ...DEFAULT_SLO, groupBy: 'system.network.name' },
          adminRoleAuthc
        );

        const response = await sloApi.findGroupings(
          slo.id,
          { instanceId: 'eth0', groupingKey: 'host' },
          adminRoleAuthc,
          400
        );

        expect(response).to.have.property('message');
        expect((response as any).message).to.contain(
          "Provided groupingKey doesn't match the SLO's groupBy field"
        );
      });

      it('returns 400 when instanceId has incorrect number of values for multi-group SLO', async () => {
        const slo = await sloApi.create(
          { ...DEFAULT_SLO, groupBy: ['system.network.name', 'event.dataset'] },
          adminRoleAuthc
        );

        const response = await sloApi.findGroupings(
          slo.id,
          { instanceId: 'eth0', groupingKey: 'system.network.name' },
          adminRoleAuthc,
          400
        );

        expect(response).to.have.property('message');
        expect((response as any).message).to.contain(
          'Provided instanceId does not match the number of grouping keys'
        );
      });
    });

    describe('query tests', () => {
      it('filters out stale documents when excludeStale is true', async () => {
        const slo = await sloApi.create(
          { ...DEFAULT_SLO, groupBy: ['host', 'region'] },
          adminRoleAuthc
        );

        const now = new Date();
        const freshTime = now.toISOString();
        const staleTime = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours ago (beyond default 24h stale threshold)

        const docs = [
          createGroupedSummaryDoc(
            slo.id,
            ['host', 'region'],
            { host: 'host-fresh', region: 'us-east-1' },
            freshTime,
            TEST_SPACE_ID
          ),
          createGroupedSummaryDoc(
            slo.id,
            ['host', 'region'],
            { host: 'host-stale', region: 'us-east-1' },
            staleTime,
            TEST_SPACE_ID
          ),
        ];

        await insertSummaryDocs(docs);

        // Without excludeStale - should return both
        const responseAll = await sloApi.findGroupings(
          slo.id,
          { instanceId: 'host-fresh,us-east-1', groupingKey: 'host' },
          adminRoleAuthc
        );

        expect(responseAll.values).to.have.length(2);
        expect(responseAll.values.sort()).to.eql(['host-fresh', 'host-stale']);

        // With excludeStale=true - should only return fresh
        const responseFiltered = await sloApi.findGroupings(
          slo.id,
          { instanceId: 'host-fresh,us-east-1', groupingKey: 'host', excludeStale: true },
          adminRoleAuthc
        );

        expect(responseFiltered.values).to.have.length(1);
        expect(responseFiltered.values).to.eql(['host-fresh']);
      });

      it('returns matching grouping values with search parameter', async () => {
        const slo = await sloApi.create(
          { ...DEFAULT_SLO, groupBy: ['host', 'region'] },
          adminRoleAuthc
        );

        const now = new Date().toISOString();

        const docs = [
          createGroupedSummaryDoc(
            slo.id,
            ['host', 'region'],
            { host: 'web-server-001', region: 'us-east-1' },
            now,
            TEST_SPACE_ID
          ),
          createGroupedSummaryDoc(
            slo.id,
            ['host', 'region'],
            { host: 'web-server-002', region: 'us-east-1' },
            now,
            TEST_SPACE_ID
          ),
          createGroupedSummaryDoc(
            slo.id,
            ['host', 'region'],
            { host: 'db-server-001', region: 'us-east-1' },
            now,
            TEST_SPACE_ID
          ),
        ];

        await insertSummaryDocs(docs);

        const response = await sloApi.findGroupings(
          slo.id,
          { instanceId: 'web-server-001,us-east-1', groupingKey: 'host', search: 'web' },
          adminRoleAuthc
        );

        expect(response.groupingKey).to.eql('host');
        expect(response.values).to.have.length(2);
        expect(response.values.sort()).to.eql(['web-server-001', 'web-server-002']);
        expect(response.afterKey).to.be(undefined);
      });

      it('supports pagination with size=1 and afterKey', async () => {
        const slo = await sloApi.create(
          { ...DEFAULT_SLO, groupBy: ['host', 'region'] },
          adminRoleAuthc
        );

        const now = new Date().toISOString();

        const docs = [
          createGroupedSummaryDoc(
            slo.id,
            ['host', 'region'],
            { host: 'alpha-host', region: 'us-east-1' },
            now,
            TEST_SPACE_ID
          ),
          createGroupedSummaryDoc(
            slo.id,
            ['host', 'region'],
            { host: 'beta-host', region: 'us-east-1' },
            now,
            TEST_SPACE_ID
          ),
          createGroupedSummaryDoc(
            slo.id,
            ['host', 'region'],
            { host: 'gamma-host', region: 'us-east-1' },
            now,
            TEST_SPACE_ID
          ),
        ];

        await insertSummaryDocs(docs);

        // First page with size=1
        const firstPage = await sloApi.findGroupings(
          slo.id,
          { instanceId: 'alpha-host,us-east-1', groupingKey: 'host', size: 1 },
          adminRoleAuthc
        );

        expect(firstPage.groupingKey).to.eql('host');
        expect(firstPage.values).to.have.length(1);
        expect(firstPage.afterKey).to.not.be(undefined);

        // Second page using afterKey
        const secondPage = await sloApi.findGroupings(
          slo.id,
          {
            instanceId: 'alpha-host,us-east-1',
            groupingKey: 'host',
            size: 1,
            afterKey: firstPage.afterKey,
          },
          adminRoleAuthc
        );

        expect(secondPage.values).to.have.length(1);
        expect(secondPage.afterKey).to.not.be(undefined);

        // Third page
        const thirdPage = await sloApi.findGroupings(
          slo.id,
          {
            instanceId: 'alpha-host,us-east-1',
            groupingKey: 'host',
            size: 1,
            afterKey: secondPage.afterKey,
          },
          adminRoleAuthc
        );

        expect(thirdPage.values).to.have.length(1);
        expect(thirdPage.afterKey).to.not.be(undefined);

        // 4th page - should be empty
        const fourthPage = await sloApi.findGroupings(
          slo.id,
          {
            instanceId: 'alpha-host,us-east-1',
            groupingKey: 'host',
            size: 1,
            afterKey: thirdPage.afterKey,
          },
          adminRoleAuthc
        );

        expect(fourthPage.values).to.have.length(0);
        expect(fourthPage.afterKey).to.be(undefined);

        // Verify no duplicates across pages
        const allHosts = [...firstPage.values, ...secondPage.values, ...thirdPage.values].sort();
        expect(allHosts).to.eql(['alpha-host', 'beta-host', 'gamma-host']);
      });
    });
  });
}
