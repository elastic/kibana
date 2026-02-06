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
import { TEST_SPACE_ID, createDummySummaryDoc } from './fixtures/slo';

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

  describe('Search SLO Definitions', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await cleanupSummaryDocs();
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    afterEach(async () => {
      await cleanupSummaryDocs();
    });

    it('searches SLO definitions by name', async () => {
      const now = new Date().toISOString();
      await insertSummaryDocs([
        createDummySummaryDoc('slo-alpha', '*', now, TEST_SPACE_ID, {
          name: 'Test SLO Alpha',
          tags: ['alpha'],
        }),
        createDummySummaryDoc('slo-beta', '*', now, TEST_SPACE_ID, {
          name: 'Test SLO Beta',
          tags: ['beta'],
        }),
      ]);

      // Search for "Alpha"
      const searchResults = await sloApi.searchDefinitions(adminRoleAuthc, {
        search: 'Alpha',
      });

      expect(searchResults.results).to.have.length(1);
      expect(searchResults.results[0].id).to.eql('slo-alpha');
      expect(searchResults.results[0].name).to.eql('Test SLO Alpha');
    });

    it('returns all SLO definitions when no search term is provided', async () => {
      const now = new Date().toISOString();
      await insertSummaryDocs([
        createDummySummaryDoc('slo-gamma', '*', now, TEST_SPACE_ID, {
          name: 'Test SLO Gamma',
        }),
        createDummySummaryDoc('slo-delta', '*', now, TEST_SPACE_ID, {
          name: 'Test SLO Delta',
        }),
      ]);

      const searchResults = await sloApi.searchDefinitions(adminRoleAuthc, {});

      expect(searchResults.results.length).to.be.greaterThan(1);
      const resultIds = searchResults.results.map((r) => r.id);
      expect(resultIds).to.contain('slo-gamma');
      expect(resultIds).to.contain('slo-delta');
    });

    it('respects the size parameter', async () => {
      const now = new Date().toISOString();
      const docs = Array.from({ length: 5 }, (_, i) =>
        createDummySummaryDoc(`slo-size-${i}`, '*', now, TEST_SPACE_ID, {
          name: `Test SLO Size ${i}`,
        })
      );

      await insertSummaryDocs(docs);

      const searchResults = await sloApi.searchDefinitions(adminRoleAuthc, {
        size: 2,
      });

      expect(searchResults.results.length).to.be.lessThan(3);
    });

    it('handles pagination with searchAfter', async () => {
      const now = new Date().toISOString();
      const docs = Array.from({ length: 3 }, (_, i) =>
        createDummySummaryDoc(`slo-pagination-${i}`, '*', now, TEST_SPACE_ID, {
          name: `Test SLO Pagination ${i}`,
        })
      );

      await insertSummaryDocs(docs);

      // First page
      const firstPage = await sloApi.searchDefinitions(adminRoleAuthc, {
        size: 1,
      });

      expect(firstPage.results.length).to.eql(1);
      expect(firstPage.searchAfter).to.be.a('string');

      // Second page using searchAfter
      if (firstPage.searchAfter) {
        const secondPage = await sloApi.searchDefinitions(adminRoleAuthc, {
          size: 1,
          searchAfter: firstPage.searchAfter,
        });

        expect(secondPage.results.length).to.be.lessThan(2);
        expect(secondPage.results[0].id).to.not.eql(firstPage.results[0].id);
      }
    });

    it('normalizes groupBy array correctly', async () => {
      const now = new Date().toISOString();
      await insertSummaryDocs([
        createDummySummaryDoc('slo-groupby', '*', now, TEST_SPACE_ID, {
          name: 'Test SLO with GroupBy',
          groupBy: ['host', 'service'],
        }),
      ]);

      const searchResults = await sloApi.searchDefinitions(adminRoleAuthc, {
        search: 'GroupBy',
      });

      expect(searchResults.results.length).to.be.greaterThan(0);
      const result = searchResults.results.find((r) => r.id === 'slo-groupby');
      expect(result).to.not.be(undefined);
      expect(result?.groupBy).to.be.an('array');
      expect(result?.groupBy).to.contain('host');
      expect(result?.groupBy).to.contain('service');
    });

    it('handles SLOs with ALL_VALUE groupBy', async () => {
      const now = new Date().toISOString();
      await insertSummaryDocs([
        createDummySummaryDoc('slo-allvalue', '*', now, TEST_SPACE_ID, {
          name: 'Test SLO with All Value',
          groupBy: '*',
        }),
      ]);

      const searchResults = await sloApi.searchDefinitions(adminRoleAuthc, {
        search: 'All Value',
      });

      expect(searchResults.results.length).to.be.greaterThan(0);
      const result = searchResults.results.find((r) => r.id === 'slo-allvalue');
      expect(result).to.not.be(undefined);
      expect(result?.groupBy).to.be.an('array');
      expect(result?.groupBy.length).to.eql(0);
    });

    it('handles invalid searchAfter gracefully', async () => {
      const searchResults = await sloApi.searchDefinitions(adminRoleAuthc, {
        searchAfter: 'invalid-json',
      });

      // Should not throw and should return results (treats invalid JSON as no pagination)
      expect(searchResults).to.have.property('results');
      expect(searchResults.results).to.be.an('array');
    });

    it('returns empty results when no SLOs match', async () => {
      const searchResults = await sloApi.searchDefinitions(adminRoleAuthc, {
        search: 'NonExistentSLO12345',
      });

      expect(searchResults.results).to.be.an('array');
      expect(searchResults.results.length).to.eql(0);
    });
  });
}
