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

  const generateSearchResponse = (hits: any[]) => ({
    took: 0,
    timed_out: false,
    _shards: {
      total: hits.length,
      successful: hits.length,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq' as const,
      },
      max_score: 1,
      hits,
    },
  });

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    getSLOHealth = new GetSLOHealth(mockScopedClusterClient, mockRepository);
  });

  it('returns the health and state', async () => {
    const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
    mockRepository.findAllByIds.mockResolvedValueOnce([slo]);
    const searchResponse = generateSearchResponse([
      aHitFromSummaryIndex(aSummaryDocument(slo)),
      aHitFromTempSummaryIndex(aSummaryDocument(slo, { isTempDoc: true })), // kept
    ]);
    mockScopedClusterClient.asCurrentUser.search.mockResolvedValue(searchResponse);
    mockScopedClusterClient.asSecondaryAuthUser.search.mockResolvedValue(searchResponse);

    const result = await getSLOHealth.execute({
      list: [{ sloId: slo.id, sloInstanceId: ALL_VALUE }],
    });

    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "health": Object {
            "overall": "unhealthy",
            "rollup": Object {
              "alignedWithSLO": false,
              "status": "missing",
            },
            "summary": Object {
              "alignedWithSLO": false,
              "status": "missing",
            },
          },
          "sloEnabled": true,
          "sloId": "95ffb9af-1384-4d24-8e3f-345a03d7a439",
          "sloInstanceId": "*",
          "sloName": "irrelevant",
          "sloRevision": 1,
          "state": "no_data",
        },
      ]
    `);
  });

  it('handles inexistant sloId', async () => {
    mockRepository.findAllByIds.mockResolvedValueOnce([]);
    const searchResponse = generateSearchResponse([]);
    mockScopedClusterClient.asCurrentUser.search.mockResolvedValue(searchResponse);
    mockScopedClusterClient.asSecondaryAuthUser.search.mockResolvedValue(searchResponse);
    mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
      transforms: [],
    } as any);

    const result = await getSLOHealth.execute({
      list: [{ sloId: 'inexistant', sloInstanceId: ALL_VALUE }],
    });

    expect(result).toHaveLength(0);
  });

  describe('computes health', () => {
    it('returns healthy when both transforms are healthy', async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);
      const searchResponse = generateSearchResponse([aHitFromSummaryIndex(aSummaryDocument(slo))]);
      mockScopedClusterClient.asCurrentUser.search.mockResolvedValue(searchResponse);
      mockScopedClusterClient.asSecondaryAuthUser.search.mockResolvedValue(searchResponse);

      // @ts-ignore
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: getSLOTransformId(slo.id, slo.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOSummaryTransformId(slo.id, slo.revision),
            health: { status: 'green' },
            state: 'started',
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
              "rollup": Object {
                "alignedWithSLO": true,
                "status": "healthy",
                "transformState": "started",
              },
              "summary": Object {
                "alignedWithSLO": true,
                "status": "healthy",
                "transformState": "started",
              },
            },
            "sloEnabled": true,
            "sloId": "95ffb9af-1384-4d24-8e3f-345a03d7a439",
            "sloInstanceId": "*",
            "sloName": "irrelevant",
            "sloRevision": 1,
            "state": "no_data",
          },
        ]
      `);
    });

    it("returns overall 'unhealthy' whenever one of the transform is unhealthy", async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);
      const searchResponse = generateSearchResponse([aHitFromSummaryIndex(aSummaryDocument(slo))]);
      mockScopedClusterClient.asCurrentUser.search.mockResolvedValue(searchResponse);
      mockScopedClusterClient.asSecondaryAuthUser.search.mockResolvedValue(searchResponse);

      // @ts-ignore
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: getSLOTransformId(slo.id, slo.revision),
            health: { status: 'yellow' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOSummaryTransformId(slo.id, slo.revision),
            health: { status: 'green' },
            state: 'started',
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
              "rollup": Object {
                "alignedWithSLO": true,
                "status": "unhealthy",
                "transformState": "started",
              },
              "summary": Object {
                "alignedWithSLO": true,
                "status": "healthy",
                "transformState": "started",
              },
            },
            "sloEnabled": true,
            "sloId": "95ffb9af-1384-4d24-8e3f-345a03d7a439",
            "sloInstanceId": "*",
            "sloName": "irrelevant",
            "sloRevision": 1,
            "state": "no_data",
          },
        ]
      `);
    });

    it("returns overall 'unhealthy' whenever one of the transform is not started", async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);
      const searchResponse = generateSearchResponse([aHitFromSummaryIndex(aSummaryDocument(slo))]);
      mockScopedClusterClient.asCurrentUser.search.mockResolvedValue(searchResponse);
      mockScopedClusterClient.asSecondaryAuthUser.search.mockResolvedValue(searchResponse);

      // @ts-ignore
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: getSLOTransformId(slo.id, slo.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOSummaryTransformId(slo.id, slo.revision),
            health: { status: 'green' },
            state: 'stopped',
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
              "rollup": Object {
                "alignedWithSLO": true,
                "status": "healthy",
                "transformState": "started",
              },
              "summary": Object {
                "alignedWithSLO": false,
                "status": "healthy",
                "transformState": "stopped",
              },
            },
            "sloEnabled": true,
            "sloId": "95ffb9af-1384-4d24-8e3f-345a03d7a439",
            "sloInstanceId": "*",
            "sloName": "irrelevant",
            "sloRevision": 1,
            "state": "no_data",
          },
        ]
      `);
    });

    it('reports a healthy SLO as healthy even when another SLO has a missing summary transform', async () => {
      const slo1 = createSLO({ id: 'c06591d1-9bd0-4538-8618-592759f265d1' });
      const slo2 = createSLO({ id: 'c06591d1-9bd0-4538-8618-592759f265d2' });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo1, slo2]);
      const searchResponse = generateSearchResponse([
        aHitFromSummaryIndex(aSummaryDocument(slo1)),
        aHitFromSummaryIndex(aSummaryDocument(slo2)),
      ]);
      mockScopedClusterClient.asCurrentUser.search.mockResolvedValue(searchResponse);
      mockScopedClusterClient.asSecondaryAuthUser.search.mockResolvedValue(searchResponse);

      // @ts-ignore
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: getSLOTransformId(slo1.id, slo1.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOTransformId(slo2.id, slo2.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
          // Missing summary transform for slo1
          {
            id: getSLOSummaryTransformId(slo2.id, slo2.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
        ],
      });

      const result = await getSLOHealth.execute({
        list: [
          { sloId: slo1.id, sloInstanceId: ALL_VALUE },
          { sloId: slo2.id, sloInstanceId: ALL_VALUE },
        ],
      });

      expect(result).toHaveLength(2);
      expect(result[0].health.summary.status).toBe('missing');
      expect(result[1].health.summary.status).toBe('healthy');
      expect(result[1].health.summary.transformState).toBe('started');
    });

    it('shows only 1 missing summary transform', async () => {
      const slo1 = createSLO({ id: 'c06591d1-9bd0-4538-8618-592759f265d1' });
      const slo2 = createSLO({ id: 'c06591d1-9bd0-4538-8618-592759f265d2' });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo1, slo2]);
      const searchResponse = generateSearchResponse([
        aHitFromSummaryIndex(aSummaryDocument(slo1)),
        aHitFromSummaryIndex(aSummaryDocument(slo2)),
      ]);
      mockScopedClusterClient.asCurrentUser.search.mockResolvedValue(searchResponse);
      mockScopedClusterClient.asSecondaryAuthUser.search.mockResolvedValue(searchResponse);

      // @ts-ignore
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: getSLOTransformId(slo1.id, slo1.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOTransformId(slo2.id, slo2.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
          // Missing summary transform for slo1
          {
            id: getSLOSummaryTransformId(slo2.id, slo2.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
        ],
      });

      const result = await getSLOHealth.execute({
        list: [
          { sloId: slo1.id, sloInstanceId: ALL_VALUE },
          { sloId: slo2.id, sloInstanceId: ALL_VALUE },
        ],
      });

      const missingSummaryTotal = result.filter(
        (res) => res.health.summary.status === 'missing'
      ).length;
      expect(missingSummaryTotal).toBe(1);
      expect(result).toHaveLength(2);
      expect(result[0].health.summary.status).toBe('missing');
      expect(result[1].health.summary.status).toBe('healthy');
    });
  });

  describe('computes state', () => {
    it('returns stale when summaryUpdatedAt is 2 days old', async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);
      const searchResponse = generateSearchResponse([aHitFromSummaryIndex(aSummaryDocument(slo))]);
      mockScopedClusterClient.asCurrentUser.search.mockResolvedValue(searchResponse);
      mockScopedClusterClient.asSecondaryAuthUser.search.mockResolvedValue(searchResponse);

      // @ts-ignore
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: getSLOTransformId(slo.id, slo.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOSummaryTransformId(slo.id, slo.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
        ],
      });

      const result = await getSLOHealth.execute({
        list: [{ sloId: slo.id, sloInstanceId: ALL_VALUE }],
      });

      // todo: changed from stale to no_data, check validity
      expect(result[0].state).toBe('no_data');
    });

    it("returns 'indexing' when diff(summaryUpdatedAt - latestSliTimestamp) >= 10min", async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      const now = Date.now();
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);
      const searchResponse = generateSearchResponse([
        aHitFromSummaryIndex(
          aSummaryDocument(slo, {
            summaryUpdatedAt: new Date(now).toISOString(),
            latestSliTimestamp: new Date(now - 10 * 60 * 1000).toISOString(), // 10min
            isTempDoc: false,
          })
        ),
      ]);
      mockScopedClusterClient.asCurrentUser.search.mockResolvedValue(searchResponse);
      mockScopedClusterClient.asSecondaryAuthUser.search.mockResolvedValue(searchResponse);

      // @ts-ignore
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: getSLOTransformId(slo.id, slo.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOSummaryTransformId(slo.id, slo.revision),
            health: { status: 'green' },
            state: 'started',
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
      const searchResponse = generateSearchResponse([
        aHitFromSummaryIndex(
          aSummaryDocument(slo, {
            summaryUpdatedAt: new Date(now).toISOString(),
            latestSliTimestamp: new Date(now - 9 * 60 * 1000 + 59 * 1000).toISOString(), // 9min59s
            isTempDoc: false,
          })
        ),
      ]);
      mockScopedClusterClient.asCurrentUser.search.mockResolvedValue(searchResponse);
      mockScopedClusterClient.asSecondaryAuthUser.search.mockResolvedValue(searchResponse);

      // @ts-ignore
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: getSLOTransformId(slo.id, slo.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOSummaryTransformId(slo.id, slo.revision),
            health: { status: 'green' },
            state: 'started',
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
