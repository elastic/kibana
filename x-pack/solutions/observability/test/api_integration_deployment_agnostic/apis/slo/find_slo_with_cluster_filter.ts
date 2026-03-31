/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import { SUMMARY_DESTINATION_INDEX_NAME } from '@kbn/slo-plugin/common/constants';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { createGroupedSummaryDoc } from './fixtures/slo';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  let adminRoleAuthc: RoleCredentials;
  let internalHeaders: InternalRequestHeader;

  async function insertSummaryDocs(docs: any[]) {
    const operations = docs.flatMap((doc) => [
      { index: { _index: SUMMARY_DESTINATION_INDEX_NAME } },
      doc,
    ]);

    await esClient.bulk({ refresh: 'wait_for', operations });
  }

  async function cleanupSummaryDocs() {
    await esClient.deleteByQuery({
      index: SUMMARY_DESTINATION_INDEX_NAME,
      query: { match_all: {} },
      refresh: true,
      conflicts: 'proceed',
    });
  }

  async function fetchOverview(filters?: string) {
    const query: Record<string, string> = {};
    if (filters) {
      query.filters = filters;
    }

    const response = await supertestWithoutAuth
      .get(`/internal/observability/slos/overview`)
      .query(query)
      .set(adminRoleAuthc.apiKeyHeader)
      .set(internalHeaders)
      .send()
      .expect(200);

    return response.body;
  }

  describe('SLO cluster-level filters (#198289)', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      internalHeaders = samlAuth.getInternalRequestHeader();
    });

    after(async () => {
      await cleanupSummaryDocs();
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    it('filters SLOs by slo.groupings.* fields (client rewrites field names before sending)', async () => {
      const now = new Date().toISOString();
      await insertSummaryDocs([
        createGroupedSummaryDoc(
          'slo-cluster-a',
          ['orchestrator.cluster.name'],
          { 'orchestrator.cluster.name': 'prod-cluster-a' },
          now
        ),
        createGroupedSummaryDoc(
          'slo-cluster-b',
          ['orchestrator.cluster.name'],
          { 'orchestrator.cluster.name': 'prod-cluster-b' },
          now
        ),
        createGroupedSummaryDoc(
          'slo-k8s',
          ['k8s.cluster.name'],
          { 'k8s.cluster.name': 'k8s-staging' },
          now
        ),
        createGroupedSummaryDoc(
          'slo-violated',
          ['orchestrator.cluster.name'],
          { 'orchestrator.cluster.name': 'prod-cluster-a' },
          now,
          { status: 'VIOLATED' }
        ),
      ]);

      const baseline = await fetchOverview();
      expect(baseline.healthy).to.eql(3);
      expect(baseline.violated).to.eql(1);

      // match_phrase on slo.groupings.orchestrator.cluster.name (client rewrites before sending)
      const matchPhraseFilter = JSON.stringify({
        filter: [
          {
            bool: {
              should: [
                {
                  match_phrase: {
                    'slo.groupings.orchestrator.cluster.name': 'prod-cluster-a',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
        must_not: [],
      });
      const matchPhraseResult = await fetchOverview(matchPhraseFilter);
      expect(matchPhraseResult.healthy).to.eql(1);
      expect(matchPhraseResult.violated).to.eql(1);

      // term filter on slo.groupings.orchestrator.cluster.name
      const termFilter = JSON.stringify({
        filter: [{ term: { 'slo.groupings.orchestrator.cluster.name': 'prod-cluster-b' } }],
        must_not: [],
      });
      const termResult = await fetchOverview(termFilter);
      expect(termResult.healthy).to.eql(1);
      expect(termResult.violated).to.eql(0);

      // k8s.cluster.name → slo.groupings.k8s.cluster.name
      const k8sFilter = JSON.stringify({
        filter: [
          {
            bool: {
              should: [{ match_phrase: { 'slo.groupings.k8s.cluster.name': 'k8s-staging' } }],
              minimum_should_match: 1,
            },
          },
        ],
        must_not: [],
      });
      const k8sResult = await fetchOverview(k8sFilter);
      expect(k8sResult.healthy).to.eql(1);

      // must_not on slo.groupings.orchestrator.cluster.name
      const mustNotFilter = JSON.stringify({
        filter: [],
        must_not: [
          {
            match_phrase: {
              'slo.groupings.orchestrator.cluster.name': 'prod-cluster-a',
            },
          },
        ],
      });
      const mustNotResult = await fetchOverview(mustNotFilter);
      expect(mustNotResult.healthy).to.eql(2);
      expect(mustNotResult.violated).to.eql(0);

      // Native field (status) stays as-is
      const statusFilter = JSON.stringify({
        filter: [{ term: { status: 'VIOLATED' } }],
        must_not: [],
      });
      const statusResult = await fetchOverview(statusFilter);
      expect(statusResult.violated).to.eql(1);
      expect(statusResult.healthy).to.eql(0);
    });
  });
}
