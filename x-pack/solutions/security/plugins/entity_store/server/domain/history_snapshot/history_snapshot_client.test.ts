/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { HistorySnapshotClient } from './history_snapshot_client';
import { HISTORY_SNAPSHOT_RESET_SCRIPT } from './constants';
import { createIndex, reindex, updateByQueryWithScript } from '../../infra/elasticsearch';

jest.mock('../../infra/elasticsearch');

const mockCreateIndex = createIndex as jest.MockedFunction<typeof createIndex>;
const mockReindex = reindex as jest.MockedFunction<typeof reindex>;
const mockUpdateByQueryWithScript = updateByQueryWithScript as jest.MockedFunction<
  typeof updateByQueryWithScript
>;

const mockGlobalStateStarted = {
  historySnapshot: { status: 'started' as const, frequency: '24h' },
  logsExtraction: {},
};

function createMockGlobalStateClient(overrides?: { status?: 'started' | 'stopped' }) {
  const historySnapshot = {
    ...mockGlobalStateStarted.historySnapshot,
    ...(overrides?.status && { status: overrides.status }),
  };
  return {
    findOrThrow: jest.fn().mockResolvedValue({
      ...mockGlobalStateStarted,
      historySnapshot,
    }),
    update: jest.fn().mockResolvedValue(undefined),
  };
}

describe('HistorySnapshotClient', () => {
  const namespace = 'default';
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockGlobalStateClient: ReturnType<typeof createMockGlobalStateClient>;
  let client: HistorySnapshotClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient = {} as jest.Mocked<ElasticsearchClient>;
    mockGlobalStateClient = createMockGlobalStateClient();
    client = new HistorySnapshotClient({
      logger: loggerMock.create(),
      esClient: mockEsClient,
      namespace,
      globalStateClient:
        mockGlobalStateClient as unknown as import('../saved_objects').EntityStoreGlobalStateClient,
    });
  });

  describe('runHistorySnapshot', () => {
    it('returns success with docCount and resetCount when reindex and updateByQuery succeed', async () => {
      mockCreateIndex.mockResolvedValue(undefined);
      mockReindex.mockResolvedValue({ created: 5, total: 5 });
      mockUpdateByQueryWithScript.mockResolvedValue({ updated: 5, total: 5 });

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(true);
      if (result.ok && !('skipped' in result)) {
        expect(result.docCount).toBe(5);
        expect(result.resetCount).toBe(5);
        expect(result.historySnapshotIndex).toMatch(
          /\.entities\.v2\.history\.security_default\.\d{4}-\d{2}-\d{2}-\d{2}$/
        );
      }
      expect(mockCreateIndex).toHaveBeenCalledTimes(1);
      expect(mockReindex).toHaveBeenCalledWith(
        mockEsClient,
        expect.objectContaining({
          source: { index: '.entities.v2.latest.security_default-00001' },
          dest: { index: expect.stringMatching(/\.entities\.v2\.history\.security_default\./) },
        })
      );
      expect(mockUpdateByQueryWithScript).toHaveBeenCalledWith(
        mockEsClient,
        expect.objectContaining({
          index: '.entities.v2.latest.security_default-00001',
          query: { match_all: {} },
          script: HISTORY_SNAPSHOT_RESET_SCRIPT,
          params: expect.objectContaining({ timestampNow: expect.any(String) }),
        })
      );
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: expect.objectContaining({
          lastExecutionTimestamp: expect.any(String),
          lastError: undefined,
        }),
      });
    });

    it('uses nested entity field access in the reset script (no flat dotted keys)', () => {
      expect(HISTORY_SNAPSHOT_RESET_SCRIPT).toContain('ctx._source.entity.lifecycle');
      expect(HISTORY_SNAPSHOT_RESET_SCRIPT).toContain('ctx._source.entity.behaviors');
      expect(HISTORY_SNAPSHOT_RESET_SCRIPT).not.toMatch(/ctx\._source\s*\[\s*['"]entity\./);
    });

    it('returns success with docCount 0 and resetCount 0 when latest index has no docs', async () => {
      mockCreateIndex.mockResolvedValue(undefined);
      mockReindex.mockResolvedValue({ created: 0, total: 0 });

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(true);
      if (result.ok && !('skipped' in result)) {
        expect(result.docCount).toBe(0);
        expect(result.resetCount).toBe(0);
      }
      expect(mockUpdateByQueryWithScript).not.toHaveBeenCalled();
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: expect.objectContaining({
          lastExecutionTimestamp: expect.any(String),
          lastError: undefined,
        }),
      });
    });

    it('returns skipped when history snapshot status is not started', async () => {
      mockGlobalStateClient.findOrThrow.mockResolvedValue({
        ...mockGlobalStateStarted,
        historySnapshot: { ...mockGlobalStateStarted.historySnapshot, status: 'stopped' },
      });
      client = new HistorySnapshotClient({
        logger: loggerMock.create(),
        esClient: mockEsClient,
        namespace,
        globalStateClient:
          mockGlobalStateClient as unknown as import('../saved_objects').EntityStoreGlobalStateClient,
      });

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(true);
      expect(result).toHaveProperty('skipped', true);
      expect(mockCreateIndex).not.toHaveBeenCalled();
      expect(mockReindex).not.toHaveBeenCalled();
      expect(mockGlobalStateClient.update).not.toHaveBeenCalled();
    });

    it('returns error when createIndex throws', async () => {
      mockCreateIndex.mockRejectedValue(new Error('index creation failed'));

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('History snapshot failed');
      }
      expect(mockReindex).not.toHaveBeenCalled();
      expect(mockUpdateByQueryWithScript).not.toHaveBeenCalled();
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: expect.objectContaining({
          lastError: { message: 'index creation failed', timestamp: expect.any(String) },
        }),
      });
    });

    it('returns error when reindex throws', async () => {
      mockCreateIndex.mockResolvedValue(undefined);
      mockReindex.mockRejectedValue(new Error('reindex failed'));

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('History snapshot failed');
      }
      expect(mockUpdateByQueryWithScript).not.toHaveBeenCalled();
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: expect.objectContaining({
          lastError: { message: 'reindex failed', timestamp: expect.any(String) },
        }),
      });
    });

    it('returns error when updateByQueryWithScript throws', async () => {
      mockCreateIndex.mockResolvedValue(undefined);
      mockReindex.mockResolvedValue({ created: 3, total: 3 });
      mockUpdateByQueryWithScript.mockRejectedValue(new Error('update_by_query failed'));

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('History snapshot failed');
      }
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: expect.objectContaining({
          lastError: {
            message: 'update_by_query failed',
            timestamp: expect.any(String),
          },
        }),
      });
    });
  });
});
