/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TransformGetTransformStatsTransformStats } from '@elastic/elasticsearch/lib/api/types';
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { ALL_VALUE } from '@kbn/slo-schema';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../common/constants';
import { createSLO } from './fixtures/slo';
import {
  aHitFromSummaryIndex,
  aHitFromTempSummaryIndex,
  aSummaryDocument,
} from './fixtures/summary_search_document';
import { GetSLOHealth } from './get_slo_health';
import { createSLORepositoryMock } from './mocks';
import type { SLORepository } from './slo_repository';

describe('GetSLOHealth', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockScopedClusterClient: ScopedClusterClientMock;
  let getSLOHealth: GetSLOHealth;

  function mockSLOCompositeAggResponse(slos: { id: any; revision: any; name: any }[]) {
    return mockScopedClusterClient.asCurrentUser.search.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 0,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        sloIds: {
          buckets: slos.map((slo) => ({
            key: {
              sloId: slo.id,
              sloInstanceId: '*',
              sloRevision: slo.revision,
              sloName: slo.name,
            },
            doc_count: 1,
          })),
        },
      },
    });
  }

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    getSLOHealth = new GetSLOHealth(mockScopedClusterClient);
  });

  it('returns the health and state', async () => {
    const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
    mockSLOCompositeAggResponse([slo]);

    mockScopedClusterClient.asCurrentUser.search.mockResolvedValueOnce({
      took: 0,
      timed_out: false,
      _shards: {
        total: 2,
        successful: 2,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 1,
          relation: 'eq',
        },
        max_score: 1,
        hits: [
          aHitFromSummaryIndex(aSummaryDocument(slo)),
          aHitFromTempSummaryIndex(aSummaryDocument(slo, { isTempDoc: true })), // kept
        ],
      },
    });

    const result = await getSLOHealth.execute({
      list: [{ sloId: slo.id, sloInstanceId: ALL_VALUE }],
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Array [
          Object {
            "health": Object {
              "overall": "unhealthy",
              "rollup": "unhealthy",
              "summary": "unhealthy",
            },
            "sloId": "95ffb9af-1384-4d24-8e3f-345a03d7a439",
            "sloInstanceId": "*",
            "sloName": "irrelevant",
            "sloRevision": 1,
            "state": "no_data",
          },
        ],
        "page": 0,
        "perPage": 500,
        "total": 1,
      }
    `);
  });

  it('handles nonexistant sloId', async () => {
    mockSLOCompositeAggResponse([]);
    mockScopedClusterClient.asCurrentUser.search.mockResolvedValueOnce({
      took: 0,
      timed_out: false,
      _shards: {
        total: 2,
        successful: 2,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 1,
          relation: 'eq',
        },
        max_score: 1,
        hits: [],
      },
    });

    const result = await getSLOHealth.execute({
      list: [{ sloId: 'nonexistant', sloInstanceId: ALL_VALUE }],
    });

    expect(result.data).toHaveLength(0);
  });

  describe('computes health', () => {
    it('returns healthy when both transforms are healthy', async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      mockSLOCompositeAggResponse([slo]);

      mockScopedClusterClient.asCurrentUser.search.mockResolvedValueOnce({
        took: 0,
        timed_out: false,
        _shards: {
          total: 2,
          successful: 2,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: {
            value: 1,
            relation: 'eq',
          },
          max_score: 1,
          hits: [aHitFromSummaryIndex(aSummaryDocument(slo))],
        },
      });

      // @ts-ignore
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: getSLOTransformId(slo.id, slo.revision),
            health: { status: 'green' },
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOSummaryTransformId(slo.id, slo.revision),
            health: { status: 'green' },
          } as TransformGetTransformStatsTransformStats,
        ],
      });

      const result = await getSLOHealth.execute({
        list: [{ sloId: slo.id, sloInstanceId: ALL_VALUE }],
      });

      expect(result).toMatchInlineSnapshot(`
        Object {
          "data": Array [
            Object {
              "health": Object {
                "overall": "healthy",
                "rollup": "healthy",
                "summary": "healthy",
              },
              "sloId": "95ffb9af-1384-4d24-8e3f-345a03d7a439",
              "sloInstanceId": "*",
              "sloName": "irrelevant",
              "sloRevision": 1,
              "state": "no_data",
            },
          ],
          "page": 0,
          "perPage": 500,
          "total": 1,
        }
      `);
    });

    it('returns unhealthy whenever one of the transform is unhealthy', async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      mockSLOCompositeAggResponse([slo]);

      mockScopedClusterClient.asCurrentUser.search.mockResolvedValue({
        took: 0,
        timed_out: false,
        _shards: {
          total: 2,
          successful: 2,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: {
            value: 1,
            relation: 'eq',
          },
          max_score: 1,
          hits: [aHitFromSummaryIndex(aSummaryDocument(slo))],
        },
      });

      // @ts-ignore
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: getSLOTransformId(slo.id, slo.revision),
            health: { status: 'yellow' },
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOSummaryTransformId(slo.id, slo.revision),
            health: { status: 'green' },
          } as TransformGetTransformStatsTransformStats,
        ],
      });

      const result = await getSLOHealth.execute({
        list: [{ sloId: slo.id, sloInstanceId: ALL_VALUE }],
      });

      expect(result).toMatchInlineSnapshot(`
        Object {
          "data": Array [
            Object {
              "health": Object {
                "overall": "unhealthy",
                "rollup": "unhealthy",
                "summary": "healthy",
              },
              "sloId": "95ffb9af-1384-4d24-8e3f-345a03d7a439",
              "sloInstanceId": "*",
              "sloName": "irrelevant",
              "sloRevision": 1,
              "state": "no_data",
            },
          ],
          "page": 0,
          "perPage": 500,
          "total": 1,
        }
      `);
    });
  });

  describe('computes state', () => {
    it('returns stale when summaryUpdatedAt is 2 days old', async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      mockSLOCompositeAggResponse([slo]);
      mockScopedClusterClient.asCurrentUser.search.mockResolvedValue({
        took: 0,
        timed_out: false,
        _shards: {
          total: 2,
          successful: 2,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: {
            value: 1,
            relation: 'eq',
          },
          max_score: 1,
          hits: [
            aHitFromSummaryIndex(
              aSummaryDocument(slo, {
                summaryUpdatedAt: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(),
                latestSliTimestamp: new Date(Date.now() - 60 * 60 * 60 * 1000).toISOString(),
                isTempDoc: false,
              })
            ),
          ],
        },
      });

      // @ts-ignore
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: getSLOTransformId(slo.id, slo.revision),
            health: { status: 'green' },
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOSummaryTransformId(slo.id, slo.revision),
            health: { status: 'green' },
          } as TransformGetTransformStatsTransformStats,
        ],
      });

      const result = await getSLOHealth.execute({
        list: [{ sloId: slo.id, sloInstanceId: ALL_VALUE }],
      });

      expect(result.data[0].state).toBe('stale');
    });

    it("returns 'indexing' when diff(summaryUpdatedAt - latestSliTimestamp) >= 10min", async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      const now = Date.now();
      mockSLOCompositeAggResponse([slo]);
      mockScopedClusterClient.asCurrentUser.search.mockResolvedValue({
        took: 0,
        timed_out: false,
        _shards: {
          total: 2,
          successful: 2,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: {
            value: 1,
            relation: 'eq',
          },
          max_score: 1,
          hits: [
            aHitFromSummaryIndex(
              aSummaryDocument(slo, {
                summaryUpdatedAt: new Date(now).toISOString(),
                latestSliTimestamp: new Date(now - 10 * 60 * 1000).toISOString(), // 10min
                isTempDoc: false,
              })
            ),
          ],
        },
      });

      // @ts-ignore
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: getSLOTransformId(slo.id, slo.revision),
            health: { status: 'green' },
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOSummaryTransformId(slo.id, slo.revision),
            health: { status: 'green' },
          } as TransformGetTransformStatsTransformStats,
        ],
      });

      const result = await getSLOHealth.execute({
        list: [{ sloId: slo.id, sloInstanceId: ALL_VALUE }],
      });

      expect(result.data[0].state).toBe('indexing');
    });

    it("returns 'running' when diff(summaryUpdatedAt - latestSliTimestamp) < 10min", async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      const now = Date.now();
      mockSLOCompositeAggResponse([slo]);
      mockScopedClusterClient.asCurrentUser.search.mockResolvedValue({
        took: 0,
        timed_out: false,
        _shards: {
          total: 2,
          successful: 2,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: {
            value: 1,
            relation: 'eq',
          },
          max_score: 1,
          hits: [
            aHitFromSummaryIndex(
              aSummaryDocument(slo, {
                summaryUpdatedAt: new Date(now).toISOString(),
                latestSliTimestamp: new Date(now - 9 * 60 * 1000 + 59 * 1000).toISOString(), // 9min59s
                isTempDoc: false,
              })
            ),
          ],
        },
      });

      // @ts-ignore
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: getSLOTransformId(slo.id, slo.revision),
            health: { status: 'green' },
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOSummaryTransformId(slo.id, slo.revision),
            health: { status: 'green' },
          } as TransformGetTransformStatsTransformStats,
        ],
      });

      const result = await getSLOHealth.execute({
        list: [{ sloId: slo.id, sloInstanceId: ALL_VALUE }],
      });

      expect(result.data[0].state).toBe('running');
    });
  });
});
