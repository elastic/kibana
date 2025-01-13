/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TransformGetTransformStatsTransformStats } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';
import { ScopedClusterClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
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
import { SLORepository } from './slo_repository';

describe('GetSLOHealth', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockScopedClusterClient: ScopedClusterClientMock;
  let getSLOHealth: GetSLOHealth;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    getSLOHealth = new GetSLOHealth(mockEsClient, mockScopedClusterClient, mockRepository);
  });

  it('returns the health and state', async () => {
    const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
    mockRepository.findAllByIds.mockResolvedValueOnce([slo]);
    mockEsClient.search.mockResolvedValue({
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
      Array [
        Object {
          "health": Object {
            "overall": "unhealthy",
            "rollup": "unhealthy",
            "summary": "unhealthy",
          },
          "sloId": "95ffb9af-1384-4d24-8e3f-345a03d7a439",
          "sloInstanceId": "*",
          "sloRevision": 1,
          "state": "no_data",
        },
      ]
    `);
  });

  it('handles inexistant sloId', async () => {
    mockRepository.findAllByIds.mockResolvedValueOnce([]);
    mockEsClient.search.mockResolvedValue({
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
          value: 0,
          relation: 'eq',
        },
        max_score: 1,
        hits: [],
      },
    });

    const result = await getSLOHealth.execute({
      list: [{ sloId: 'inexistant', sloInstanceId: ALL_VALUE }],
    });

    expect(result).toHaveLength(0);
  });

  describe('computes health', () => {
    it('returns healthy when both transforms are healthy', async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);
      mockEsClient.search.mockResolvedValue({
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
        Array [
          Object {
            "health": Object {
              "overall": "healthy",
              "rollup": "healthy",
              "summary": "healthy",
            },
            "sloId": "95ffb9af-1384-4d24-8e3f-345a03d7a439",
            "sloInstanceId": "*",
            "sloRevision": 1,
            "state": "no_data",
          },
        ]
      `);
    });

    it('returns unhealthy whenever one of the transform is unhealthy', async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);
      mockEsClient.search.mockResolvedValue({
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
        Array [
          Object {
            "health": Object {
              "overall": "unhealthy",
              "rollup": "unhealthy",
              "summary": "healthy",
            },
            "sloId": "95ffb9af-1384-4d24-8e3f-345a03d7a439",
            "sloInstanceId": "*",
            "sloRevision": 1,
            "state": "no_data",
          },
        ]
      `);
    });
  });

  describe('computes state', () => {
    it('returns stale when summaryUpdatedAt is 2 days old', async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);
      mockEsClient.search.mockResolvedValue({
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

      expect(result[0].state).toBe('stale');
    });

    it("returns 'indexing' when diff(summaryUpdatedAt - latestSliTimestamp) >= 10min", async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      const now = Date.now();
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);
      mockEsClient.search.mockResolvedValue({
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

      expect(result[0].state).toBe('indexing');
    });

    it("returns 'running' when diff(summaryUpdatedAt - latestSliTimestamp) < 10min", async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      const now = Date.now();
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);
      mockEsClient.search.mockResolvedValue({
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

      expect(result[0].state).toBe('running');
    });
  });
});
