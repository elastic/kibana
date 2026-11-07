/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createHuntHistoryDataClient } from './hunt_history_data_client';
import type { HuntHistoryDataClient } from './hunt_history_data_client';
import { getAiHuntHistoryIndexName } from '../../../../common/entity_analytics/ai_hunt_history/constants';
import type { CreateHuntRequest } from '../../../../common/entity_analytics/ai_hunt_history/types';

jest.mock('./indices/hunt_history_index_service', () => ({
  createHuntHistoryIndexService: () => ({
    indexName: '.entity-analytics-hunts-default',
    createIndexIfMissing: jest.fn().mockResolvedValue(undefined),
  }),
}));

const makeCreateRequest = (overrides: Partial<CreateHuntRequest> = {}): CreateHuntRequest => ({
  question: 'Find lateral movement in the last 7 days.',
  scopedPrompt: 'SCOPED: find lateral movement',
  summary: {
    verdict: 'Two accounts were reactivated.',
    severity: 'high',
    confidence: 80,
    findingCount: 2,
    entityCount: 1,
    alertCount: 1,
  },
  result: { content: 'The narrative.', artifacts: [{ type: 'alert' }], activities: [] },
  ...overrides,
});

const indexNotFound = () => ({
  statusCode: 404,
  meta: { body: { error: { type: 'index_not_found_exception' } } },
});

describe('HuntHistoryDataClient', () => {
  const spaceId = 'default';
  const indexName = getAiHuntHistoryIndexName(spaceId);

  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let client: HuntHistoryDataClient;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
    client = createHuntHistoryDataClient({ esClient, logger, spaceId });
  });

  describe('createHunt', () => {
    it('indexes a snake_case document with a server-derived author and returns an id', async () => {
      esClient.index.mockResolvedValueOnce({ _id: 'x' } as never);

      const id = await client.createHunt(makeCreateRequest(), 'analyst');

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(esClient.index).toHaveBeenCalledTimes(1);
      const call = esClient.index.mock.calls[0][0] as {
        index: string;
        document: Record<string, unknown>;
      };
      expect(call.index).toBe(indexName);
      expect(call.document.created_by).toBe('analyst');
      expect(call.document.space).toBe(spaceId);
      expect(call.document.scoped_prompt).toBe('SCOPED: find lateral movement');
      expect((call.document.summary as Record<string, unknown>).finding_count).toBe(2);
      expect(call.document.pinned).toBe(false);
      expect(call.document.status).toBe('complete');
    });
  });

  describe('listHunts', () => {
    it('returns list items sorted server-side and excludes the heavy result payload', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [
            {
              _source: {
                id: 'h1',
                space: spaceId,
                question: 'Q',
                created_at: '2026-07-17T10:00:00.000Z',
                updated_at: '2026-07-17T10:00:00.000Z',
                created_by: 'analyst',
                pinned: true,
                status: 'complete',
                summary: {
                  verdict: 'v',
                  finding_count: 3,
                  entity_count: 1,
                  alert_count: 2,
                },
              },
            },
          ],
        },
      } as never);

      const result = await client.listHunts();

      expect(result.total).toBe(1);
      expect(result.hunts[0].pinned).toBe(true);
      expect(result.hunts[0].summary.findingCount).toBe(3);
      const searchCall = esClient.search.mock.calls[0][0] as { _source_excludes?: string[] };
      expect(searchCall._source_excludes).toEqual(['result']);
    });

    it('returns empty when the index does not exist yet', async () => {
      esClient.search.mockRejectedValueOnce(indexNotFound());
      const result = await client.listHunts();
      expect(result).toEqual({ hunts: [], total: 0 });
    });
  });

  describe('getHunt', () => {
    it('maps a snake_case document into a camelCase record', async () => {
      esClient.get.mockResolvedValueOnce({
        found: true,
        _source: {
          id: 'h1',
          space: spaceId,
          question: 'Q',
          scoped_prompt: 'SCOPED',
          created_at: '2026-07-17T10:00:00.000Z',
          updated_at: '2026-07-17T10:00:00.000Z',
          created_by: 'analyst',
          pinned: false,
          status: 'complete',
          summary: { verdict: 'v', finding_count: 1, entity_count: 0, alert_count: 0 },
          result: { content: 'c', artifacts: [], activities: [] },
        },
      } as never);

      const record = await client.getHunt('h1');

      expect(record?.scopedPrompt).toBe('SCOPED');
      expect(record?.summary.findingCount).toBe(1);
      expect(record?.result.content).toBe('c');
    });

    it('returns undefined on a 404', async () => {
      esClient.get.mockRejectedValueOnce({ statusCode: 404 });
      expect(await client.getHunt('missing')).toBeUndefined();
    });
  });

  describe('patchHunt', () => {
    it('updates pinned state and re-reads the record', async () => {
      const doc = {
        id: 'h1',
        space: spaceId,
        question: 'Q',
        created_at: '2026-07-17T10:00:00.000Z',
        updated_at: '2026-07-17T10:00:00.000Z',
        created_by: 'analyst',
        pinned: false,
        status: 'complete',
        summary: { verdict: 'v', finding_count: 0, entity_count: 0, alert_count: 0 },
        result: { content: '', artifacts: [], activities: [] },
      };
      esClient.get
        .mockResolvedValueOnce({ found: true, _source: doc } as never)
        .mockResolvedValueOnce({ found: true, _source: { ...doc, pinned: true } } as never);
      esClient.update.mockResolvedValueOnce({} as never);

      const updated = await client.patchHunt('h1', { pinned: true });

      expect(updated?.pinned).toBe(true);
      const updateCall = esClient.update.mock.calls[0][0] as { doc: Record<string, unknown> };
      expect(updateCall.doc.pinned).toBe(true);
    });

    it('returns undefined when the target does not exist', async () => {
      esClient.get.mockRejectedValueOnce({ statusCode: 404 });
      expect(await client.patchHunt('missing', { name: 'x' })).toBeUndefined();
      expect(esClient.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteHunt', () => {
    it('returns true when a doc was deleted', async () => {
      esClient.delete.mockResolvedValueOnce({ result: 'deleted' } as never);
      expect(await client.deleteHunt('h1')).toBe(true);
    });

    it('returns false on a 404', async () => {
      esClient.delete.mockRejectedValueOnce({ statusCode: 404 });
      expect(await client.deleteHunt('missing')).toBe(false);
    });
  });
});
