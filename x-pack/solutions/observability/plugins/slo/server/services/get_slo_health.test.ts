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
import { aSummaryDocument } from './fixtures/summary_search_document';
import { GetSLOHealth } from './get_slo_health';

describe('GetSLOHealth', () => {
  let mockScopedClusterClient: ScopedClusterClientMock;
  let getSLOHealth: GetSLOHealth;

  function mockSLOCompositeAggResponse(
    slos: { id: any; revision: any; name: any }[],
    summaryDocs: Array<{ sloId: string; summaryDoc?: any; hasOnlyTempSummaryDoc?: boolean }> = []
  ) {
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
          buckets: slos.map((slo) => {
            const summaryDocData = summaryDocs.find((doc) => doc.sloId === slo.id);
            const hasOnlyTempSummaryDoc = summaryDocData?.hasOnlyTempSummaryDoc ?? false;
            // Always provide a summaryDoc when a bucket exists - use provided one or create a default
            const summaryDoc = summaryDocData?.summaryDoc ?? aSummaryDocument(slo);
            return {
              key: {
                sloId: slo.id,
                sloInstanceId: '*',
                sloRevision: slo.revision,
                sloName: slo.name,
              },
              doc_count: 1,
              summaryDoc: {
                hits: {
                  hits: [
                    {
                      _source: summaryDoc,
                    },
                  ],
                },
              },
              nonTempSummaryDocs: {
                doc_count: hasOnlyTempSummaryDoc ? 0 : 1,
              },
            };
          }),
        },
      },
    });
  }

  beforeEach(() => {
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    getSLOHealth = new GetSLOHealth(mockScopedClusterClient);
  });

  it('returns the health and state', async () => {
    const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
    const summaryDoc = aSummaryDocument(slo);
    mockSLOCompositeAggResponse(
      [slo],
      [
        {
          sloId: slo.id,
          summaryDoc,
          hasOnlyTempSummaryDoc: false,
        },
      ]
    );

    mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
      transforms: [],
    } as any);

    const result = await getSLOHealth.execute({
      list: [{ sloId: slo.id, sloInstanceId: ALL_VALUE }],
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Array [
          Object {
            "health": Object {
              "overall": "unhealthy",
              "rollup": Object {
                "status": "missing",
              },
              "summary": Object {
                "status": "missing",
              },
            },
            "sloId": "95ffb9af-1384-4d24-8e3f-345a03d7a439",
            "sloName": "irrelevant",
            "sloRevision": 1,
            "state": "no_data",
          },
        ],
        "page": 0,
        "perPage": 100,
        "total": 1,
      }
    `);
  });

  it('handles nonexistant sloId', async () => {
    mockSLOCompositeAggResponse([]);
    mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
      transforms: [],
    } as any);

    const result = await getSLOHealth.execute({
      list: [{ sloId: 'nonexistant', sloInstanceId: ALL_VALUE }],
    });

    expect(result.data).toHaveLength(0);
  });

  describe('computes health', () => {
    it('returns healthy when both transforms are healthy', async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      const summaryDoc = aSummaryDocument(slo);
      mockSLOCompositeAggResponse(
        [slo],
        [
          {
            sloId: slo.id,
            summaryDoc,
            hasOnlyTempSummaryDoc: false,
          },
        ]
      );

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
        Object {
          "data": Array [
            Object {
              "health": Object {
                "overall": "healthy",
                "rollup": Object {
                  "status": "healthy",
                  "transformState": "started",
                },
                "summary": Object {
                  "status": "healthy",
                  "transformState": "started",
                },
              },
              "sloId": "95ffb9af-1384-4d24-8e3f-345a03d7a439",
              "sloName": "irrelevant",
              "sloRevision": 1,
              "state": "no_data",
            },
          ],
          "page": 0,
          "perPage": 100,
          "total": 1,
        }
      `);
    });

    it('returns unhealthy whenever one of the transform is unhealthy', async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      const summaryDoc = aSummaryDocument(slo);
      mockSLOCompositeAggResponse(
        [slo],
        [
          {
            sloId: slo.id,
            summaryDoc,
            hasOnlyTempSummaryDoc: false,
          },
        ]
      );

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
        Object {
          "data": Array [
            Object {
              "health": Object {
                "overall": "unhealthy",
                "rollup": Object {
                  "status": "unhealthy",
                  "transformState": "started",
                },
                "summary": Object {
                  "status": "healthy",
                  "transformState": "started",
                },
              },
              "sloId": "95ffb9af-1384-4d24-8e3f-345a03d7a439",
              "sloName": "irrelevant",
              "sloRevision": 1,
              "state": "no_data",
            },
          ],
          "page": 0,
          "perPage": 100,
          "total": 1,
        }
      `);
    });

    it('reports a healthy SLO as healthy even when another SLO has a missing summary transform', async () => {
      const slo1 = createSLO({ id: 'c06591d1-9bd0-4538-8618-592759f265d1' });
      const slo2 = createSLO({ id: 'c06591d1-9bd0-4538-8618-592759f265d2' });
      const summaryDoc1 = aSummaryDocument(slo1);
      const summaryDoc2 = aSummaryDocument(slo2);
      mockSLOCompositeAggResponse(
        [slo1, slo2],
        [
          {
            sloId: slo1.id,
            summaryDoc: summaryDoc1,
            hasOnlyTempSummaryDoc: false,
          },
          {
            sloId: slo2.id,
            summaryDoc: summaryDoc2,
            hasOnlyTempSummaryDoc: false,
          },
        ]
      );

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

      expect(result.data).toHaveLength(2);
      expect(result.data[0].health.summary.status).toBe('missing');
      expect(result.data[1].health.summary.status).toBe('healthy');
      expect(result.data[1].health.summary.transformState).toBe('started');
    });

    it('shows only 1 missing summary transform', async () => {
      const slo1 = createSLO({ id: 'c06591d1-9bd0-4538-8618-592759f265d1' });
      const slo2 = createSLO({ id: 'c06591d1-9bd0-4538-8618-592759f265d2' });
      const summaryDoc1 = aSummaryDocument(slo1);
      const summaryDoc2 = aSummaryDocument(slo2);
      mockSLOCompositeAggResponse(
        [slo1, slo2],
        [
          {
            sloId: slo1.id,
            summaryDoc: summaryDoc1,
            hasOnlyTempSummaryDoc: false,
          },
          {
            sloId: slo2.id,
            summaryDoc: summaryDoc2,
            hasOnlyTempSummaryDoc: false,
          },
        ]
      );

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

      const missingSummaryTotal = result.data.filter(
        (res) => res.health.summary.status === 'missing'
      ).length;
      expect(missingSummaryTotal).toBe(1);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].health.summary.status).toBe('missing');
      expect(result.data[1].health.summary.status).toBe('healthy');
    });
  });

  describe('computes state', () => {
    it('returns stale when summaryUpdatedAt is 2 days old', async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      const summaryDoc = aSummaryDocument(slo, {
        summaryUpdatedAt: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(),
        latestSliTimestamp: new Date(Date.now() - 60 * 60 * 60 * 1000).toISOString(),
        isTempDoc: false,
      });
      mockSLOCompositeAggResponse(
        [slo],
        [
          {
            sloId: slo.id,
            summaryDoc,
            hasOnlyTempSummaryDoc: false,
          },
        ]
      );

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

      expect(result.data[0].state).toBe('stale');
    });

    it("returns 'indexing' when diff(summaryUpdatedAt - latestSliTimestamp) >= 10min", async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      const now = Date.now();
      const summaryDoc = aSummaryDocument(slo, {
        summaryUpdatedAt: new Date(now).toISOString(),
        latestSliTimestamp: new Date(now - 10 * 60 * 1000).toISOString(), // 10min
        isTempDoc: false,
      });
      mockSLOCompositeAggResponse(
        [slo],
        [
          {
            sloId: slo.id,
            summaryDoc,
            hasOnlyTempSummaryDoc: false,
          },
        ]
      );

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

      expect(result.data[0].state).toBe('indexing');
    });

    it("returns 'running' when diff(summaryUpdatedAt - latestSliTimestamp) < 10min", async () => {
      const slo = createSLO({ id: '95ffb9af-1384-4d24-8e3f-345a03d7a439' });
      const now = Date.now();
      const summaryDoc = aSummaryDocument(slo, {
        summaryUpdatedAt: new Date(now).toISOString(),
        latestSliTimestamp: new Date(now - 9 * 60 * 1000 + 59 * 1000).toISOString(), // 9min59s
        isTempDoc: false,
      });
      mockSLOCompositeAggResponse(
        [slo],
        [
          {
            sloId: slo.id,
            summaryDoc,
            hasOnlyTempSummaryDoc: false,
          },
        ]
      );

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

      expect(result.data[0].state).toBe('running');
    });
  });

  describe('pagination', () => {
    const slos = Array.from({ length: 25 }, (_, i) =>
      createSLO({ id: `slo-id-${i}`, name: `slo-name-${i}` })
    );

    beforeEach(() => {
      const summaryDocs = slos.map((slo) => ({
        sloId: slo.id,
        summaryDoc: aSummaryDocument(slo),
        hasOnlyTempSummaryDoc: false,
      }));
      mockSLOCompositeAggResponse(slos, summaryDocs);

      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: slos.flatMap((slo) => [
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
        ]),
      } as any);
    });

    it('returns the first page', async () => {
      const result = await getSLOHealth.execute({
        list: slos.map((slo) => ({ sloId: slo.id, sloInstanceId: ALL_VALUE })),
        page: 0,
        perPage: 10,
      });

      expect(result.data).toHaveLength(10);
      expect(result.page).toBe(0);
      expect(result.perPage).toBe(10);
      expect(result.total).toBe(25);
      expect(result.data[0].sloId).toBe('slo-id-0');
      expect(result.data[9].sloId).toBe('slo-id-9');
    });

    it('returns the second page', async () => {
      const result = await getSLOHealth.execute({
        list: slos.map((slo) => ({ sloId: slo.id, sloInstanceId: ALL_VALUE })),
        page: 1,
        perPage: 10,
      });

      expect(result.data).toHaveLength(10);
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(10);
      expect(result.total).toBe(25);
      expect(result.data[0].sloId).toBe('slo-id-10');
      expect(result.data[9].sloId).toBe('slo-id-19');
    });

    it('returns the last page', async () => {
      const result = await getSLOHealth.execute({
        list: slos.map((slo) => ({ sloId: slo.id, sloInstanceId: ALL_VALUE })),
        page: 2,
        perPage: 10,
      });

      expect(result.data).toHaveLength(5);
      expect(result.page).toBe(2);
      expect(result.perPage).toBe(10);
      expect(result.total).toBe(25);
      expect(result.data[0].sloId).toBe('slo-id-20');
      expect(result.data[4].sloId).toBe('slo-id-24');
    });

    it('returns an empty page if page is out of bounds', async () => {
      const result = await getSLOHealth.execute({
        list: slos.map((slo) => ({ sloId: slo.id, sloInstanceId: ALL_VALUE })),
        page: 3,
        perPage: 10,
      });

      expect(result.data).toHaveLength(0);
      expect(result.page).toBe(3);
      expect(result.perPage).toBe(10);
      expect(result.total).toBe(25);
    });

    it('returns all items if perPage is larger than total', async () => {
      const result = await getSLOHealth.execute({
        list: slos.map((slo) => ({ sloId: slo.id, sloInstanceId: ALL_VALUE })),
        page: 0,
        perPage: 30,
      });

      expect(result.data).toHaveLength(25);
      expect(result.page).toBe(0);
      expect(result.perPage).toBe(30);
      expect(result.total).toBe(25);
    });
  });

  describe('statusFilter', () => {
    const slo1 = createSLO({ id: 'healthy-slo', name: 'healthy-slo' });
    const slo2 = createSLO({ id: 'unhealthy-slo', name: 'unhealthy-slo' });
    const slos = [slo1, slo2];

    beforeEach(() => {
      const summaryDocs = slos.map((slo) => ({
        sloId: slo.id,
        summaryDoc: aSummaryDocument(slo),
        hasOnlyTempSummaryDoc: false,
      }));
      mockSLOCompositeAggResponse(slos, summaryDocs);

      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: getSLOTransformId(slo1.id, slo1.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOSummaryTransformId(slo1.id, slo1.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOTransformId(slo2.id, slo2.revision),
            health: { status: 'red' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOSummaryTransformId(slo2.id, slo2.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
        ],
      } as any);
    });

    it("returns only healthy SLOs when statusFilter is 'healthy'", async () => {
      const result = await getSLOHealth.execute({
        list: slos.map((slo) => ({ sloId: slo.id, sloInstanceId: ALL_VALUE })),
        statusFilter: 'healthy',
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].sloId).toBe('healthy-slo');
      expect(result.data[0].health.overall).toBe('healthy');
    });

    it("returns only unhealthy SLOs when statusFilter is 'unhealthy'", async () => {
      const result = await getSLOHealth.execute({
        list: slos.map((slo) => ({ sloId: slo.id, sloInstanceId: ALL_VALUE })),
        statusFilter: 'unhealthy',
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].sloId).toBe('unhealthy-slo');
      expect(result.data[0].health.overall).toBe('unhealthy');
    });

    it('returns all SLOs when statusFilter is not provided', async () => {
      const result = await getSLOHealth.execute({
        list: slos.map((slo) => ({ sloId: slo.id, sloInstanceId: ALL_VALUE })),
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });
});
