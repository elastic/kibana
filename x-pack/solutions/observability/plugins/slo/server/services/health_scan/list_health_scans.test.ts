/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { listHealthScans } from './list_health_scans';
import { IllegalArgumentError } from '../../errors';

type ScopedClusterClientMock = ReturnType<
  typeof elasticsearchServiceMock.createScopedClusterClient
>;

function createMockScanBucketsResponse(
  buckets: Array<{
    scanId: string;
    docCount: number;
    problematic: number;
    latestTimestamp: string;
  }>
) {
  return {
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
    aggregations: {
      scans: {
        buckets: buckets.map((b) => ({
          key: { scanId: b.scanId },
          doc_count: b.docCount,
          latest_timestamp: {
            value: new Date(b.latestTimestamp).getTime(),
            value_as_string: b.latestTimestamp,
          },
          problematic: { doc_count: b.problematic },
        })),
      },
    },
  };
}

describe('listHealthScans', () => {
  let scopedClusterClient: ScopedClusterClientMock;
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;

  const deps = {
    scopedClusterClient: {} as ScopedClusterClientMock,
    taskManager: {} as ReturnType<typeof taskManagerMock.createStart>,
    spaceIds: ['default'],
  };

  beforeEach(() => {
    scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    taskManager = taskManagerMock.createStart();
    deps.scopedClusterClient = scopedClusterClient;
    deps.taskManager = taskManager;
    taskManager.fetch.mockResolvedValue({ docs: [], versionMap: new Map() });
    jest.clearAllMocks();
  });

  describe('space filtering', () => {
    it('includes a spaceId filter in the composite aggregation query for a single space', async () => {
      scopedClusterClient.asInternalUser.search.mockResolvedValue(
        createMockScanBucketsResponse([]) as any
      );

      await listHealthScans({}, deps);

      const searchCall = scopedClusterClient.asInternalUser.search.mock.calls[0];
      const filter = searchCall?.[0]?.query?.bool?.filter;
      expect(filter).toEqual([{ terms: { spaceId: ['default'] } }]);
    });

    it('includes a spaceId filter with multiple space IDs when provided', async () => {
      scopedClusterClient.asInternalUser.search.mockResolvedValue(
        createMockScanBucketsResponse([]) as any
      );

      const multiSpaceDeps = { ...deps, spaceIds: ['space-a', 'space-b', 'space-c'] };
      await listHealthScans({}, multiSpaceDeps);

      const searchCall = scopedClusterClient.asInternalUser.search.mock.calls[0];
      const filter = searchCall?.[0]?.query?.bool?.filter;
      expect(filter).toEqual([{ terms: { spaceId: ['space-a', 'space-b', 'space-c'] } }]);
    });
  });

  describe('size validation', () => {
    beforeEach(() => {
      scopedClusterClient.asInternalUser.search.mockResolvedValue(
        createMockScanBucketsResponse([]) as any
      );
    });

    it('throws when size is 0', async () => {
      await expect(listHealthScans({ size: 0 }, deps)).rejects.toThrow(IllegalArgumentError);
    });

    it('throws when size exceeds 100', async () => {
      await expect(listHealthScans({ size: 101 }, deps)).rejects.toThrow(IllegalArgumentError);
    });
  });

  describe('scan results', () => {
    it('returns scans from the composite aggregation buckets', async () => {
      scopedClusterClient.asInternalUser.search.mockResolvedValue(
        createMockScanBucketsResponse([
          {
            scanId: 'scan-1',
            docCount: 50,
            problematic: 5,
            latestTimestamp: '2026-01-15T10:00:00.000Z',
          },
          {
            scanId: 'scan-2',
            docCount: 30,
            problematic: 0,
            latestTimestamp: '2026-01-14T10:00:00.000Z',
          },
        ]) as any
      );

      const result = await listHealthScans({}, deps);

      expect(result.scans).toHaveLength(2);
      expect(result.scans[0]).toEqual({
        scanId: 'scan-1',
        latestTimestamp: '2026-01-15T10:00:00.000Z',
        total: 50,
        problematic: 5,
        status: 'completed',
      });
      expect(result.scans[1]).toEqual({
        scanId: 'scan-2',
        latestTimestamp: '2026-01-14T10:00:00.000Z',
        total: 30,
        problematic: 0,
        status: 'completed',
      });
    });

    it('marks scans as pending when a matching recent task is not done', async () => {
      scopedClusterClient.asInternalUser.search.mockResolvedValue(
        createMockScanBucketsResponse([
          {
            scanId: 'scan-1',
            docCount: 10,
            problematic: 2,
            latestTimestamp: '2026-01-15T10:00:00.000Z',
          },
        ]) as any
      );

      taskManager.fetch.mockResolvedValue({
        docs: [
          {
            id: 'scan-1',
            scheduledAt: new Date('2026-01-15T09:55:00.000Z'),
            state: { isDone: false },
          },
        ],
      } as any);

      const result = await listHealthScans({}, deps);

      expect(result.scans[0].status).toBe('pending');
    });

    it('includes scheduled tasks that have not produced documents yet', async () => {
      scopedClusterClient.asInternalUser.search.mockResolvedValue(
        createMockScanBucketsResponse([]) as any
      );

      taskManager.fetch.mockResolvedValue({
        docs: [
          {
            id: 'scan-new',
            scheduledAt: new Date('2026-01-15T10:00:00.000Z'),
            state: { isDone: false },
          },
        ],
      } as any);

      const result = await listHealthScans({}, deps);

      expect(result.scans).toHaveLength(1);
      expect(result.scans[0]).toEqual({
        scanId: 'scan-new',
        latestTimestamp: '2026-01-15T10:00:00.000Z',
        total: 0,
        problematic: 0,
        status: 'pending',
      });
    });
  });
});
