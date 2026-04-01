/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../../../../common/constants';
import {
  apiTest,
  createSloTransformAssertions,
  DEFAULT_SLO,
  mergeSloApiHeaders,
  pollUntilTrue,
  type SloTransformAssertions,
} from '../../fixtures';

const getRollupDataEsQuery = (id: string) => ({
  index: '.slo-observability.sli-v3*',
  size: 0,
  query: {
    bool: {
      filter: [
        {
          term: {
            'slo.id': id,
          },
        },
      ],
    },
  },
  aggs: {
    last_doc: {
      top_hits: {
        sort: [
          {
            '@timestamp': {
              order: 'desc' as const,
            },
          },
        ],
        _source: {
          includes: ['slo.instanceId'],
        },
        size: 1,
      },
    },
  },
});

apiTest.describe(
  'Create SLOs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let transformHelper: SloTransformAssertions;
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, esClient, samlAuth, requestAuth, sloHostsDataForge }) => {
      await sloHostsDataForge.setup();
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
      transformHelper = createSloTransformAssertions(apiClient, esClient, async () =>
        samlAuth.session.getApiCredentialsForRole('admin')
      );
    });

    apiTest.afterAll(async ({ kbnClient, sloHostsDataForge }) => {
      await kbnClient.spaces.delete('space1').catch(() => {});
      await kbnClient.spaces.delete('space2').catch(() => {});
      await sloHostsDataForge.teardown();
    });

    apiTest('creates a new slo and transforms', async ({ apiClient }) => {
      const apiResponse = await apiClient.post('api/observability/slos', {
        headers,
        body: DEFAULT_SLO,
        responseType: 'json',
      });
      expect(apiResponse).toHaveStatusCode(200);
      const id = apiResponse.body.id as string;

      const definitionsRes = await apiClient.get('api/observability/slos/_definitions', {
        headers,
        responseType: 'json',
      });
      expect(definitionsRes).toHaveStatusCode(200);
      const definitions = definitionsRes.body as {
        total: number;
        results: Array<Record<string, unknown>>;
      };
      expect(definitions.total).toBe(1);

      const row = definitions.results[0];
      const { createdBy, updatedBy, ...defWithoutUsers } = row;
      expect(createdBy).toStrictEqual(updatedBy);

      expect(defWithoutUsers).toMatchObject({
        artifacts: { dashboards: [] },
        budgetingMethod: 'occurrences',
        updatedAt: row.updatedAt,
        createdAt: row.createdAt,
        description: 'Fixture for api integration tests',
        enabled: true,
        groupBy: 'tags',
        id,
        indicator: {
          params: {
            filter: 'system.network.name: eth1',
            good: 'container.cpu.user.pct < 1',
            index: 'kbn-data-forge*',
            timestampField: '@timestamp',
            total: 'container.cpu.user.pct: *',
          },
          type: 'sli.kql.custom',
        },
        name: 'Test SLO for api integration',
        objective: {
          target: 0.99,
        },
        revision: 1,
        settings: {
          frequency: '1m',
          syncDelay: '1m',
          preventInitialBackfill: false,
        },
        tags: ['test'],
        timeWindow: {
          duration: '7d',
          type: 'rolling',
        },
        version: 2,
      });

      const rollUpTransformResponse = await transformHelper.assertExist(getSLOTransformId(id, 1));
      const rollup = rollUpTransformResponse as {
        transforms: Array<{
          source: { index: string[] };
          dest: { index: string; pipeline: string };
          pivot: { group_by: Record<string, unknown> };
        }>;
      };
      expect(rollup.transforms[0].source.index).toStrictEqual(['kbn-data-forge*']);
      expect(rollup.transforms[0].dest).toStrictEqual({
        index: '.slo-observability.sli-v3.6',
        pipeline: `.slo-observability.sli.pipeline-${id}-1`,
      });
      expect(rollup.transforms[0].pivot.group_by).toStrictEqual({
        'slo.groupings.tags': { terms: { field: 'tags' } },
        '@timestamp': { date_histogram: { field: '@timestamp', fixed_interval: '1m' } },
      });

      const summaryTransformResponse = await transformHelper.assertExist(
        getSLOSummaryTransformId(id, 1)
      );
      const summary = summaryTransformResponse as {
        transforms: Array<{
          source: { index: string[] };
          dest: { index: string; pipeline: string };
        }>;
      };
      expect(summary.transforms[0].source.index).toStrictEqual(['.slo-observability.sli-v3.6*']);
      expect(summary.transforms[0].dest).toStrictEqual({
        index: '.slo-observability.summary-v3.6',
        pipeline: `.slo-observability.summary.pipeline-${id}-1`,
      });
    });

    apiTest(
      'persists dashboard artifacts and returns them in the definition',
      async ({ apiClient }) => {
        const ARTIFACTS_SLO = {
          ...DEFAULT_SLO,
          artifacts: { dashboards: [{ id: 'dashboard-abc' }, { id: 'dashboard-def' }] },
        };

        const createRes = await apiClient.post('api/observability/slos', {
          headers,
          body: ARTIFACTS_SLO,
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const id = createRes.body.id as string;

        const retrieved = await apiClient.get(`api/observability/slos/${id}`, {
          headers,
          responseType: 'json',
        });
        expect(retrieved).toHaveStatusCode(200);
        expect((retrieved.body as { artifacts: unknown }).artifacts).toStrictEqual({
          dashboards: [{ id: 'dashboard-abc' }, { id: 'dashboard-def' }],
        });
      }
    );

    apiTest(
      'creates two SLOs with matching ids across different spaces',
      async ({ apiClient, kbnClient }) => {
        const spaceId1 = 'space1';
        const spaceId2 = 'space2';

        await kbnClient.spaces.create({ id: spaceId1, name: spaceId1, initials: '1' });
        await kbnClient.spaces.create({ id: spaceId2, name: spaceId2, initials: '2' });

        const sloApiResponse = await apiClient.post(`s/${spaceId1}/api/observability/slos`, {
          headers,
          body: DEFAULT_SLO,
          responseType: 'json',
        });
        expect(sloApiResponse).toHaveStatusCode(200);
        const id = sloApiResponse.body.id as string;

        const conflict = await apiClient.post(`s/${spaceId2}/api/observability/slos`, {
          headers,
          body: { ...DEFAULT_SLO, id },
          responseType: 'json',
        });
        expect(conflict).toHaveStatusCode(409);
      }
    );

    apiTest('creates instanceId for SLOs with multi groupBy', async ({ apiClient, esClient }) => {
      const apiResponse = await apiClient.post('api/observability/slos', {
        headers,
        body: {
          ...DEFAULT_SLO,
          groupBy: ['system.network.name', 'event.dataset'],
        },
        responseType: 'json',
      });
      expect(apiResponse).toHaveStatusCode(200);
      const id = apiResponse.body.id as string;

      await pollUntilTrue(
        async () => {
          const response = await esClient.search(getRollupDataEsQuery(id));
          const hits = (
            response as { aggregations?: { last_doc?: { hits?: { hits?: unknown[] } } } }
          ).aggregations?.last_doc?.hits?.hits;
          const src = hits?.[0] as { _source?: { slo?: { instanceId?: string } } } | undefined;
          return src?._source?.slo?.instanceId === 'eth1,system.network';
        },
        { timeoutMs: 180_000, intervalMs: 3000 }
      );
    });

    apiTest('creates instanceId for SLOs with single groupBy', async ({ apiClient, esClient }) => {
      const apiResponse = await apiClient.post('api/observability/slos', {
        headers,
        body: {
          ...DEFAULT_SLO,
          groupBy: 'system.network.name',
        },
        responseType: 'json',
      });
      expect(apiResponse).toHaveStatusCode(200);
      const id = apiResponse.body.id as string;

      await pollUntilTrue(
        async () => {
          const response = await esClient.search(getRollupDataEsQuery(id));
          const hits = (
            response as { aggregations?: { last_doc?: { hits?: { hits?: unknown[] } } } }
          ).aggregations?.last_doc?.hits?.hits;
          const src = hits?.[0] as { _source?: { slo?: { instanceId?: string } } } | undefined;
          return src?._source?.slo?.instanceId === 'eth1';
        },
        { timeoutMs: 180_000, intervalMs: 3000 }
      );
    });

    apiTest('creates instanceId for SLOs without groupBy ([])', async ({ apiClient, esClient }) => {
      const apiResponse = await apiClient.post('api/observability/slos', {
        headers,
        body: {
          ...DEFAULT_SLO,
          groupBy: [],
        },
        responseType: 'json',
      });
      expect(apiResponse).toHaveStatusCode(200);
      const id = apiResponse.body.id as string;

      await pollUntilTrue(
        async () => {
          const response = await esClient.search(getRollupDataEsQuery(id));
          const hits = (
            response as { aggregations?: { last_doc?: { hits?: { hits?: unknown[] } } } }
          ).aggregations?.last_doc?.hits?.hits;
          const src = hits?.[0] as { _source?: { slo?: { instanceId?: string } } } | undefined;
          return src?._source?.slo?.instanceId === '*';
        },
        { timeoutMs: 300_000, intervalMs: 3000 }
      );
    });

    apiTest(
      'creates instanceId for SLOs without groupBy (["*"])',
      async ({ apiClient, esClient }) => {
        const apiResponse = await apiClient.post('api/observability/slos', {
          headers,
          body: {
            ...DEFAULT_SLO,
            groupBy: ['*'],
          },
          responseType: 'json',
        });
        expect(apiResponse).toHaveStatusCode(200);
        const id = apiResponse.body.id as string;

        await pollUntilTrue(
          async () => {
            const response = await esClient.search(getRollupDataEsQuery(id));
            const hits = (
              response as { aggregations?: { last_doc?: { hits?: { hits?: unknown[] } } } }
            ).aggregations?.last_doc?.hits?.hits;
            const src = hits?.[0] as { _source?: { slo?: { instanceId?: string } } } | undefined;
            return src?._source?.slo?.instanceId === '*';
          },
          { timeoutMs: 180_000, intervalMs: 3000 }
        );
      }
    );

    apiTest('creates instanceId for SLOs without groupBy ("")', async ({ apiClient, esClient }) => {
      const apiResponse = await apiClient.post('api/observability/slos', {
        headers,
        body: {
          ...DEFAULT_SLO,
          groupBy: '',
        },
        responseType: 'json',
      });
      expect(apiResponse).toHaveStatusCode(200);
      const id = apiResponse.body.id as string;

      await pollUntilTrue(
        async () => {
          const response = await esClient.search(getRollupDataEsQuery(id));
          const hits = (
            response as { aggregations?: { last_doc?: { hits?: { hits?: unknown[] } } } }
          ).aggregations?.last_doc?.hits?.hits;
          const src = hits?.[0] as { _source?: { slo?: { instanceId?: string } } } | undefined;
          return src?._source?.slo?.instanceId === '*';
        },
        { timeoutMs: 180_000, intervalMs: 3000 }
      );
    });
  }
);
