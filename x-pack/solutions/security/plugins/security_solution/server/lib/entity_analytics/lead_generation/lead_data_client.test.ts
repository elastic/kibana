/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createLeadDataClient } from './lead_data_client';
import type { LeadDataClient } from './lead_data_client';
import { getLeadsIndexName } from '../../../../common/entity_analytics/lead_generation/constants';
import type { Lead } from '../../../../common/entity_analytics/lead_generation/types';

const makeTestLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: 'lead-1',
  title: 'Test Lead',
  byline: 'Entity X has suspicious activity',
  description: 'Detailed investigation guide',
  entities: [{ type: 'user', name: 'admin' }],
  tags: ['brute_force'],
  priority: 8,
  chatRecommendations: ['What alerts exist?', 'Check risk score history'],
  timestamp: new Date().toISOString(),
  staleness: 'fresh',
  status: 'active',
  observations: [
    {
      entityId: 'user:admin',
      moduleId: 'risk_analysis',
      type: 'high_risk_score',
      score: 85,
      severity: 'high',
      confidence: 0.9,
      description: 'Risk score is 85',
      metadata: { scoreNorm: 85 },
    },
  ],
  executionUuid: '550e8400-e29b-41d4-a716-446655440000',
  sourceType: 'adhoc',
  contentHash: 'abc123',
  entityHash: 'def456',
  version: 1,
  ...overrides,
});

describe('LeadDataClient', () => {
  const spaceId = 'default';
  const adhocIndex = getLeadsIndexName(spaceId, 'adhoc');
  const scheduledIndex = getLeadsIndexName(spaceId, 'scheduled');
  const allIndices = `${adhocIndex},${scheduledIndex}`;

  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let client: LeadDataClient;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
    client = createLeadDataClient({ esClient, logger, spaceId });
  });

  describe('createLeads', () => {
    it('bulk indexes new leads with snake_case fields including hash fields', async () => {
      esClient.bulk.mockResolvedValueOnce({ errors: false, items: [], took: 1 });
      esClient.deleteByQuery.mockResolvedValueOnce({
        deleted: 0,
        failures: [],
        timed_out: false,
        took: 1,
        total: 0,
      });

      const lead = makeTestLead();
      await client.createLeads({
        newLeads: [lead],
        exactDuplicateHashes: [],
        versionCandidates: [],
        executionId: 'exec-1',
        sourceType: 'adhoc',
      });

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      const [bulkCall] = esClient.bulk.mock.calls;
      const body = bulkCall[0].body as unknown[];

      expect(body[0]).toEqual({ index: { _index: adhocIndex, _id: lead.id } });

      const doc = body[1] as Record<string, unknown>;
      expect(doc.chat_recommendations).toEqual(lead.chatRecommendations);
      expect(doc.execution_uuid).toBe('exec-1');
      expect(doc.source_type).toBe('adhoc');
      expect(doc.content_hash).toBe('abc123');
      expect(doc.entity_hash).toBe('def456');
      expect(doc.version).toBe(1);
      expect(doc.observations).toEqual([
        expect.objectContaining({
          entity_id: 'user:admin',
          module_id: 'risk_analysis',
        }),
      ]);

      // camelCase fields should NOT be present
      expect(doc).not.toHaveProperty('chatRecommendations');
      expect(doc).not.toHaveProperty('executionUuid');
      expect(doc).not.toHaveProperty('sourceType');
      expect(doc).not.toHaveProperty('contentHash');
      expect(doc).not.toHaveProperty('entityHash');

      expect(esClient.deleteByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          index: adhocIndex,
          query: { bool: { must_not: [{ term: { execution_uuid: 'exec-1' } }] } },
        })
      );
    });

    it('touches exact duplicates by updating their execution_uuid', async () => {
      esClient.updateByQuery.mockResolvedValueOnce({
        updated: 2,
        failures: [],
        timed_out: false,
        took: 1,
        total: 2,
      });
      esClient.deleteByQuery.mockResolvedValueOnce({
        deleted: 0,
        failures: [],
        timed_out: false,
        took: 1,
        total: 0,
      });

      await client.createLeads({
        newLeads: [],
        exactDuplicateHashes: ['hash-a', 'hash-b'],
        versionCandidates: [],
        executionId: 'exec-2',
        sourceType: 'adhoc',
      });

      expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
      const [touchCall] = esClient.updateByQuery.mock.calls;
      expect(touchCall[0].query).toEqual({ terms: { content_hash: ['hash-a', 'hash-b'] } });
      expect(touchCall[0].script).toEqual(
        expect.objectContaining({
          params: { executionId: 'exec-2' },
        })
      );

      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('versions existing leads by updating observations and bumping version', async () => {
      esClient.updateByQuery.mockResolvedValue({
        updated: 1,
        failures: [],
        timed_out: false,
        took: 1,
        total: 1,
      });
      esClient.deleteByQuery.mockResolvedValueOnce({
        deleted: 0,
        failures: [],
        timed_out: false,
        took: 1,
        total: 0,
      });

      const versionedLead = makeTestLead({
        id: 'lead-versioned',
        entityHash: 'entity-hash-1',
        contentHash: 'new-content-hash',
        priority: 9,
      });

      await client.createLeads({
        newLeads: [],
        exactDuplicateHashes: [],
        versionCandidates: [versionedLead],
        executionId: 'exec-3',
        sourceType: 'adhoc',
      });

      expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
      const [versionCall] = esClient.updateByQuery.mock.calls;
      expect(versionCall[0].query).toEqual({ term: { entity_hash: 'entity-hash-1' } });
      expect(versionCall[0].script).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            contentHash: 'new-content-hash',
            executionId: 'exec-3',
            priority: 9,
          }),
        })
      );

      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('handles all three buckets in a single call', async () => {
      // touch (updateByQuery #1) + version (updateByQuery #2) + bulk + cleanup
      esClient.updateByQuery.mockResolvedValue({
        updated: 1,
        failures: [],
        timed_out: false,
        took: 1,
        total: 1,
      });
      esClient.bulk.mockResolvedValueOnce({ errors: false, items: [], took: 1 });
      esClient.deleteByQuery.mockResolvedValueOnce({
        deleted: 0,
        failures: [],
        timed_out: false,
        took: 1,
        total: 0,
      });

      await client.createLeads({
        newLeads: [makeTestLead({ id: 'new-1' })],
        exactDuplicateHashes: ['dup-hash'],
        versionCandidates: [makeTestLead({ id: 'ver-1', entityHash: 'eh-1' })],
        executionId: 'exec-4',
        sourceType: 'adhoc',
      });

      // touch + version = 2 updateByQuery calls
      expect(esClient.updateByQuery).toHaveBeenCalledTimes(2);
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
    });

    it('uses the scheduled index when sourceType is scheduled', async () => {
      esClient.bulk.mockResolvedValueOnce({ errors: false, items: [], took: 1 });
      esClient.deleteByQuery.mockResolvedValueOnce({
        deleted: 0,
        failures: [],
        timed_out: false,
        took: 1,
        total: 0,
      });

      await client.createLeads({
        newLeads: [makeTestLead()],
        exactDuplicateHashes: [],
        versionCandidates: [],
        executionId: 'exec-5',
        sourceType: 'scheduled',
      });

      const [bulkCall] = esClient.bulk.mock.calls;
      const body = bulkCall[0].body as unknown[];
      expect((body[0] as Record<string, unknown>).index).toEqual(
        expect.objectContaining({ _index: scheduledIndex })
      );
    });

    it('skips bulk indexing when newLeads array is empty but still cleans up stale docs', async () => {
      esClient.deleteByQuery.mockResolvedValueOnce({
        deleted: 2,
        failures: [],
        timed_out: false,
        took: 1,
        total: 2,
      });

      await client.createLeads({
        newLeads: [],
        exactDuplicateHashes: [],
        versionCandidates: [],
        executionId: 'exec-6',
        sourceType: 'adhoc',
      });

      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
    });

    it('logs a warning and does not throw on persistence failure', async () => {
      esClient.bulk.mockRejectedValueOnce(new Error('ES unavailable'));

      await expect(
        client.createLeads({
          newLeads: [makeTestLead()],
          exactDuplicateHashes: [],
          versionCandidates: [],
          executionId: 'exec-7',
          sourceType: 'adhoc',
        })
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to persist leads'));
    });
  });

  describe('findLeads', () => {
    it('queries both indices with pagination and transforms response to camelCase', async () => {
      const esDoc = {
        id: 'lead-1',
        title: 'Test Lead',
        byline: 'Entity X',
        description: 'Details',
        entities: [{ type: 'user', name: 'admin' }],
        tags: ['brute_force'],
        priority: 8,
        chat_recommendations: ['Question 1'],
        timestamp: new Date().toISOString(),
        staleness: 'fresh',
        status: 'active',
        observations: [
          {
            entity_id: 'user:admin',
            module_id: 'risk_analysis',
            type: 'high_risk_score',
            score: 85,
            severity: 'high',
            confidence: 0.9,
            description: 'Risk score 85',
            metadata: {},
          },
        ],
        execution_uuid: 'exec-uuid',
        source_type: 'adhoc',
        content_hash: 'ch-1',
        entity_hash: 'eh-1',
        version: 2,
      };

      esClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [{ _source: esDoc, _id: 'lead-1', _index: adhocIndex }],
        },
      } as never);

      const result = await client.findLeads({ page: 1, perPage: 10 });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: allIndices,
          size: 10,
          from: 0,
          track_total_hits: true,
        })
      );

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(10);
      expect(result.leads).toHaveLength(1);

      const lead = result.leads[0];
      expect(lead.chatRecommendations).toEqual(['Question 1']);
      expect(lead.executionUuid).toBe('exec-uuid');
      expect(lead.sourceType).toBe('adhoc');
      expect(lead.contentHash).toBe('ch-1');
      expect(lead.entityHash).toBe('eh-1');
      expect(lead.version).toBe(2);
      expect(lead.observations[0].entityId).toBe('user:admin');
      expect(lead.observations[0].moduleId).toBe('risk_analysis');
    });

    it('applies status filter when provided', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      } as never);

      await client.findLeads({ status: 'dismissed' });

      const searchCall = esClient.search.mock.calls[0];
      expect(searchCall).toBeDefined();
      expect((searchCall[0] as Record<string, unknown>).query).toEqual({
        bool: { filter: [{ term: { status: 'dismissed' } }] },
      });
    });

    it('returns empty results when indices are unavailable', async () => {
      esClient.search.mockRejectedValueOnce(new Error('index_not_found_exception'));

      const result = await client.findLeads({});
      expect(result).toEqual({ leads: [], total: 0, page: 1, perPage: 20 });
    });
  });

  describe('getLeadById', () => {
    it('returns the lead when found', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [
            {
              _id: 'lead-1',
              _index: adhocIndex,
              _source: {
                id: 'lead-1',
                title: 'Found Lead',
                byline: '',
                description: '',
                entities: [],
                tags: [],
                priority: 5,
                chat_recommendations: [],
                timestamp: new Date().toISOString(),
                staleness: 'fresh',
                status: 'active',
                observations: [],
                execution_uuid: 'e-1',
                source_type: 'adhoc',
                content_hash: 'ch',
                entity_hash: 'eh',
                version: 1,
              },
            },
          ],
        },
      } as never);

      const lead = await client.getLeadById('lead-1');

      expect(lead).not.toBeNull();
      expect(lead!.id).toBe('lead-1');
      expect(lead!.title).toBe('Found Lead');
      expect(lead!.contentHash).toBe('ch');
      expect(lead!.entityHash).toBe('eh');
      expect(lead!.version).toBe(1);
    });

    it('returns null when lead is not found', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      } as never);

      const lead = await client.getLeadById('nonexistent');
      expect(lead).toBeNull();
    });

    it('returns null on search error', async () => {
      esClient.search.mockRejectedValueOnce(new Error('index_not_found'));

      const lead = await client.getLeadById('lead-1');
      expect(lead).toBeNull();
    });
  });

  describe('updateLead', () => {
    it('uses parameterized Painless script (no injection risk)', async () => {
      esClient.updateByQuery.mockResolvedValueOnce({
        updated: 1,
        failures: [],
        timed_out: false,
        took: 1,
        total: 1,
      });

      await client.updateLead('lead-1', { status: 'dismissed' });

      const [call] = esClient.updateByQuery.mock.calls;
      expect(call[0].script).toEqual({
        source: `ctx._source['status'] = params.status`,
        lang: 'painless',
        params: { status: 'dismissed' },
      });
    });
  });

  describe('dismissLead', () => {
    it('sets status to dismissed via updateByQuery', async () => {
      esClient.updateByQuery.mockResolvedValueOnce({
        updated: 1,
        failures: [],
        timed_out: false,
        took: 1,
        total: 1,
      });

      const result = await client.dismissLead('lead-1');
      expect(result).toBe(true);

      expect(esClient.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          index: allIndices,
          query: { term: { id: 'lead-1' } },
        })
      );
    });

    it('returns false when no document matched', async () => {
      esClient.updateByQuery.mockResolvedValueOnce({
        updated: 0,
        failures: [],
        timed_out: false,
        took: 1,
        total: 0,
      });

      const result = await client.dismissLead('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('bulkUpdateLeads', () => {
    it('updates multiple leads by ids', async () => {
      esClient.updateByQuery.mockResolvedValueOnce({
        updated: 3,
        failures: [],
        timed_out: false,
        took: 1,
        total: 3,
      });

      const count = await client.bulkUpdateLeads(['a', 'b', 'c'], { status: 'dismissed' });
      expect(count).toBe(3);

      const [call] = esClient.updateByQuery.mock.calls;
      expect(call[0].query).toEqual({ terms: { id: ['a', 'b', 'c'] } });
      expect(call[0].script).toEqual(
        expect.objectContaining({
          params: { status: 'dismissed' },
        })
      );
    });

    it('returns 0 for an empty ids array', async () => {
      const count = await client.bulkUpdateLeads([], { status: 'active' });
      expect(count).toBe(0);
      expect(esClient.updateByQuery).not.toHaveBeenCalled();
    });

    it('returns 0 on error', async () => {
      esClient.updateByQuery.mockRejectedValueOnce(new Error('cluster error'));

      const count = await client.bulkUpdateLeads(['a'], { status: 'dismissed' });
      expect(count).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('returns status with total count and last run timestamp', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 42, relation: 'eq' },
          hits: [
            {
              _id: 'lead-1',
              _index: adhocIndex,
              _source: { timestamp: '2026-03-10T00:00:00.000Z' },
            },
          ],
        },
      } as never);

      const status = await client.getStatus();
      expect(status).toEqual({
        isEnabled: false,
        indexExists: true,
        totalLeads: 42,
        lastRun: '2026-03-10T00:00:00.000Z',
      });
    });

    it('returns defaults when indices do not exist', async () => {
      esClient.search.mockRejectedValueOnce(new Error('index_not_found'));

      const status = await client.getStatus();
      expect(status).toEqual({
        isEnabled: false,
        indexExists: false,
        totalLeads: 0,
        lastRun: null,
      });
    });
  });

  describe('deleteAllLeads', () => {
    it('deletes all docs from both indices', async () => {
      esClient.deleteByQuery.mockResolvedValueOnce({
        deleted: 10,
        failures: [],
        timed_out: false,
        took: 1,
        total: 10,
      });

      await client.deleteAllLeads();

      expect(esClient.deleteByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          index: allIndices,
          query: { match_all: {} },
        })
      );
    });
  });
});
