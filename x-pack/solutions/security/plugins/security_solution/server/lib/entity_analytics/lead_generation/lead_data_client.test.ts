/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';

const mockCreateIndex = jest.fn().mockResolvedValue(undefined);

jest.mock('./indices/lead_index_service', () => ({
  createLeadIndexService: () => ({
    createIndex: mockCreateIndex,
    doesIndexExist: jest.fn().mockResolvedValue(true),
    deleteIndex: jest.fn(),
  }),
}));

import { createLeadDataClient } from './lead_data_client';
import type { LeadDataClient } from './lead_data_client';
import { getLeadsIndexName } from '../../../../common/entity_analytics/lead_generation/constants';
import type { LeadSignal } from './lead_matching';
import { encodeCursor } from './change_cursor';
import type { Lead as SynthesizedLead } from './types';

const toObservationSource = (signals: readonly LeadSignal[]) =>
  signals.map((s) => ({ module_id: s.moduleId, type: s.type, severity: s.severity }));

const makeEsSecurityException = () => ({
  statusCode: 403,
  body: { error: { type: 'security_exception', reason: 'access denied' } },
  meta: { body: { error: { type: 'security_exception', reason: 'access denied' } } },
});

const makeTestLead = (overrides: Partial<SynthesizedLead> = {}): SynthesizedLead => {
  const entity = overrides.entity ?? { type: 'user', name: 'admin', id: 'user:admin' };
  const observations = overrides.observations ?? [
    {
      entityId: 'user:admin',
      moduleId: 'risk_analysis',
      type: 'high_risk_score',
      score: 85,
      severity: 'high' as const,
      confidence: 0.9,
      description: 'Risk score is 85',
      metadata: { scoreNorm: 85 },
    },
  ];
  const timestamp = overrides.timestamp ?? new Date().toISOString();

  return {
    id: 'lead-1',
    title: 'Test Lead',
    byline: 'Entity X has suspicious activity',
    description: 'Detailed investigation guide',
    tags: ['brute_force'],
    priority: 8,
    chatRecommendations: ['What alerts exist?', 'Check risk score history'],
    staleness: 'fresh',
    topRelatedEntities: [],
    relatedEntityCounts: {},
    origin: 'observations',
    ...overrides,
    entity: { ...entity, record: {} },
    observations,
    timestamp,
  };
};

describe('LeadDataClient', () => {
  const spaceId = 'default';
  const indexName = getLeadsIndexName(spaceId);

  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let client: LeadDataClient;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
    client = createLeadDataClient({ esClient, logger, spaceId });
  });

  const toCandidate = (lead: SynthesizedLead) => ({
    lead,
    leadId: hashEuid(lead.entity.id),
    observations: lead.observations,
  });

  const mockExistingLead = (
    entityKey: string,
    existing?: { observations: readonly LeadSignal[]; status: string }
  ) => {
    if (!existing) {
      esClient.mget.mockResolvedValueOnce({
        docs: [{ _id: entityKey, found: false }],
      } as never);
      return;
    }
    esClient.mget.mockResolvedValueOnce({
      docs: [
        {
          _id: entityKey,
          found: true,
          _source: {
            observations: toObservationSource(existing.observations),
            version: 1,
            status: existing.status,
          },
        },
      ],
    } as never);
  };

  describe('classifyLeadCandidates', () => {
    it('returns create when no lead exists for the entity', async () => {
      const candidate = toCandidate(makeTestLead());
      mockExistingLead(candidate.leadId);

      const [result] = await client.classifyLeadCandidates([candidate]);

      expect(result.decision).toEqual({ type: 'create' });
    });

    it('returns "refresh" when an active lead has equal evidence', async () => {
      const candidate = toCandidate(makeTestLead());
      mockExistingLead(candidate.leadId, {
        observations: candidate.observations,
        status: 'active',
      });

      const [result] = await client.classifyLeadCandidates([candidate]);

      expect(result.decision).toEqual({
        type: 'refresh',
        existingId: candidate.leadId,
      });
    });

    it('classifies as "update" when an active lead escalates', async () => {
      const base = makeTestLead();
      const candidate = toCandidate({
        ...base,
        observations: [
          ...base.observations,
          {
            entityId: 'user:admin',
            moduleId: 'alert_analysis',
            type: 'alert_spike',
            score: 70,
            severity: 'medium',
            confidence: 0.8,
            description: 'Alert volume spike',
            metadata: {},
          },
        ],
      });
      mockExistingLead(candidate.leadId, {
        observations: [candidate.observations[0]],
        status: 'active',
      });

      const [result] = await client.classifyLeadCandidates([candidate]);

      expect(result.decision).toEqual({
        type: 'update',
        existingId: candidate.leadId,
        allowReopen: false,
      });
    });

    it('classifies as "skip" when a dismissed lead has equal evidence', async () => {
      const candidate = toCandidate(makeTestLead());
      mockExistingLead(candidate.leadId, {
        observations: candidate.observations,
        status: 'dismissed',
      });

      const [result] = await client.classifyLeadCandidates([candidate]);

      expect(result.decision).toEqual({ type: 'skip' });
    });

    it('classifies as "update" when a dismissed lead escalates', async () => {
      const base = makeTestLead();
      const candidate = toCandidate({
        ...base,
        observations: [
          ...base.observations,
          {
            entityId: 'user:admin',
            moduleId: 'alert_analysis',
            type: 'alert_spike',
            score: 70,
            severity: 'medium',
            confidence: 0.8,
            description: 'Alert volume spike',
            metadata: {},
          },
        ],
      });
      mockExistingLead(candidate.leadId, {
        observations: [candidate.observations[0]],
        status: 'dismissed',
      });

      const [result] = await client.classifyLeadCandidates([candidate]);

      expect(result.decision).toEqual({
        type: 'update',
        existingId: candidate.leadId,
        allowReopen: true,
      });
    });

    it('classifies as "skip" when a dismissed lead has decayed evidence', async () => {
      const candidate = toCandidate(makeTestLead());
      mockExistingLead(candidate.leadId, {
        observations: [
          ...candidate.observations,
          { moduleId: 'anomaly_detection', type: 'ml_anomaly', severity: 'high' },
        ],
        status: 'dismissed',
      });

      const [result] = await client.classifyLeadCandidates([candidate]);

      expect(result.decision).toEqual({ type: 'skip' });
    });

    it('returns no decisions for an empty candidate list', async () => {
      await expect(client.classifyLeadCandidates([])).resolves.toEqual([]);
      expect(esClient.mget).not.toHaveBeenCalled();
    });

    it('re-throws when the lookup returns security_exception', async () => {
      const securityException = makeEsSecurityException();
      esClient.mget.mockRejectedValueOnce(securityException);

      await expect(client.classifyLeadCandidates([toCandidate(makeTestLead())])).rejects.toBe(
        securityException
      );
    });
  });

  describe('persistLeads', () => {
    it('does not write when there are no actions', async () => {
      const result = await client.persistLeads({
        executionId: 'exec-empty',
        sourceType: 'adhoc',
        timestamp: new Date().toISOString(),
        refreshes: [],
        creates: [],
        updates: [],
      });

      expect(result).toBe(0);
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('reconciles the index mapping even when the index already exists', async () => {
      const lead = makeTestLead();
      esClient.bulk.mockResolvedValueOnce({ errors: false, items: [], took: 1 });

      await client.persistLeads({
        executionId: 'exec-mapping',
        sourceType: 'adhoc',
        timestamp: lead.timestamp,
        refreshes: [],
        creates: [lead],
        updates: [],
      });

      expect(mockCreateIndex).toHaveBeenCalled();
    });

    it('handles leads creation successfully', async () => {
      const lead = makeTestLead();
      const entityKey = hashEuid(lead.entity.id);
      esClient.bulk.mockResolvedValueOnce({ errors: false, items: [], took: 1 });

      const result = await client.persistLeads({
        executionId: 'exec-1',
        sourceType: 'adhoc',
        timestamp: lead.timestamp,
        refreshes: [],
        creates: [lead],
        updates: [],
      });

      expect(result).toBe(0);
      const body = esClient.bulk.mock.calls[0][0].body as unknown[];
      expect(body[0]).toEqual(
        expect.objectContaining({
          update: expect.objectContaining({ _index: indexName, _id: entityKey }),
        })
      );
    });

    it('converts topRelatedEntities to snake_case script params on create', async () => {
      const lead = makeTestLead({
        topRelatedEntities: [
          {
            id: 'host:web-01',
            type: 'host',
            name: 'web-01',
            kinds: ['administers'],
            riskLevel: 'High',
            criticality: 'extreme_impact',
            interactedWithAtLeast: 4,
          },
        ],
        relatedEntityCounts: { administers: 1 },
      });
      esClient.bulk.mockResolvedValueOnce({ errors: false, items: [], took: 1 });

      await client.persistLeads({
        executionId: 'exec-related',
        sourceType: 'adhoc',
        timestamp: lead.timestamp,
        refreshes: [],
        creates: [lead],
        updates: [],
      });

      const body = esClient.bulk.mock.calls[0][0].body as Array<Record<string, unknown>>;
      const script = body[1].script as { params: Record<string, unknown> };
      expect(script.params.top_related_entities).toEqual([
        {
          id: 'host:web-01',
          type: 'host',
          name: 'web-01',
          kinds: ['administers'],
          risk_level: 'High',
          criticality: 'extreme_impact',
          interacted_with_at_least: 4,
        },
      ]);
      expect(script.params.related_entity_counts).toEqual([{ kind: 'administers', count: 1 }]);
    });

    it('returns the failed item count when bulk has errors', async () => {
      const leadOk = makeTestLead({
        entity: { type: 'user', name: 'a', id: 'user:a', record: {} },
      });
      const leadFail = makeTestLead({
        entity: { type: 'user', name: 'b', id: 'user:b', record: {} },
      });
      const okKey = hashEuid(leadOk.entity.id);
      const failKey = hashEuid(leadFail.entity.id);

      esClient.bulk.mockResolvedValueOnce({
        errors: true,
        took: 1,
        items: [
          {
            update: {
              _id: okKey,
              _index: indexName,
              status: 200,
            },
          },
          {
            update: {
              _id: failKey,
              _index: indexName,
              status: 500,
              error: { type: 'illegal_argument_exception', reason: 'boom' },
            },
          },
        ],
      });

      const result = await client.persistLeads({
        executionId: 'exec-partial',
        sourceType: 'adhoc',
        timestamp: leadOk.timestamp,
        refreshes: [],
        creates: [leadOk, leadFail],
        updates: [],
      });

      expect(result).toBe(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Bulk update had 1/2 failures')
      );
    });

    it('returns the action count and does not throw when bulk fails', async () => {
      esClient.bulk.mockRejectedValueOnce(new Error('ES unavailable'));

      const lead = makeTestLead();
      const result = await client.persistLeads({
        executionId: 'exec-throw',
        sourceType: 'adhoc',
        timestamp: lead.timestamp,
        refreshes: [],
        creates: [lead],
        updates: [],
      });

      expect(result).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to persist leads'));
    });

    it('re-throws when ES returns security_exception so callers can surface the 403', async () => {
      const securityException = makeEsSecurityException();
      esClient.bulk.mockRejectedValueOnce(securityException);

      await expect(
        client.persistLeads({
          executionId: 'exec-403',
          sourceType: 'adhoc',
          timestamp: new Date().toISOString(),
          refreshes: [],
          creates: [makeTestLead()],
          updates: [],
        })
      ).rejects.toBe(securityException);

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('findLeads', () => {
    it('queries the index with pagination and transforms response to camelCase', async () => {
      const esDoc = {
        id: 'lead-1',
        title: 'Test Lead',
        byline: 'Entity X',
        description: 'Details',
        entity: { type: 'user', name: 'admin', id: 'user:admin' },
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
        created_at: '2026-03-10T00:00:00.000Z',
        changed_at: '2026-03-10T00:00:00.000Z',
        version: 1,
        content_hash: 'abc123',
      };

      esClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [{ _source: esDoc, _id: 'lead-1', _index: indexName }],
        },
      } as never);

      const result = await client.findLeads({ page: 1, perPage: 10 });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: indexName,
          size: 10,
          from: 0,
          track_total_hits: true,
        })
      );

      expect(result.total).toBe(1);
      expect(result.leads).toHaveLength(1);

      const lead = result.leads[0];
      expect(lead.chatRecommendations).toEqual(['Question 1']);
      expect(lead.executionUuid).toBe('exec-uuid');
      expect(lead.sourceType).toBe('adhoc');
      expect(lead.observations[0].entityId).toBe('user:admin');
      expect(lead.version).toBe(1);
      expect(lead.changedAt).toBe('2026-03-10T00:00:00.000Z');
    });

    it('reads the entity EUID (`entity.id`) back from the stored document', async () => {
      const esDoc = {
        id: 'lead-euid',
        title: 'Test Lead',
        byline: 'Entity X',
        description: 'Details',
        entity: {
          type: 'host',
          name: '8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
          id: 'host:8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
        },
        tags: [],
        priority: 8,
        chat_recommendations: [],
        timestamp: new Date().toISOString(),
        staleness: 'fresh',
        status: 'active',
        observations: [],
        execution_uuid: 'exec-uuid',
        source_type: 'adhoc',
        created_at: '2026-03-10T00:00:00.000Z',
        changed_at: '2026-03-10T00:00:00.000Z',
        version: 1,
        content_hash: 'hash',
      };

      esClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [{ _source: esDoc, _id: 'lead-euid', _index: indexName }],
        },
      } as never);

      const result = await client.findLeads({ page: 1, perPage: 10 });

      expect(result.leads[0].entity).toEqual({
        type: 'host',
        name: '8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
        id: 'host:8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
      });
    });

    it('converts top_related_entities back to camelCase', async () => {
      const esDoc = {
        id: 'lead-related',
        title: 'Test Lead',
        byline: 'Entity X',
        description: 'Details',
        entity: { type: 'user', name: 'admin', id: 'user:admin' },
        tags: [],
        priority: 8,
        chat_recommendations: [],
        timestamp: new Date().toISOString(),
        staleness: 'fresh',
        status: 'active',
        observations: [],
        top_related_entities: [
          {
            id: 'host:web-01',
            type: 'host',
            name: 'web-01',
            kinds: ['administers'],
            risk_level: 'High',
            criticality: 'extreme_impact',
            interacted_with_at_least: 4,
          },
        ],
        related_entity_counts: [{ kind: 'administers', count: 1 }],
        execution_uuid: 'exec-uuid',
        source_type: 'adhoc',
        created_at: '2026-03-10T00:00:00.000Z',
        changed_at: '2026-03-10T00:00:00.000Z',
        version: 1,
        content_hash: 'hash-related',
      };

      esClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [{ _source: esDoc, _id: 'lead-related', _index: indexName }],
        },
      } as never);

      const result = await client.findLeads({ page: 1, perPage: 10 });

      expect(result.leads[0].topRelatedEntities).toEqual([
        {
          id: 'host:web-01',
          type: 'host',
          name: 'web-01',
          kinds: ['administers'],
          riskLevel: 'High',
          criticality: 'extreme_impact',
          interactedWithAtLeast: 4,
        },
      ]);
      expect(result.leads[0].relatedEntityCounts).toEqual({ administers: 1 });
    });

    it('defaults topRelatedEntities to [] for leads persisted before the field existed', async () => {
      const esDoc = {
        id: 'lead-legacy',
        title: 'Test Lead',
        byline: 'Entity X',
        description: 'Details',
        entity: { type: 'user', name: 'admin', id: 'user:admin' },
        tags: [],
        priority: 8,
        chat_recommendations: [],
        timestamp: new Date().toISOString(),
        staleness: 'fresh',
        status: 'active',
        observations: [],
        execution_uuid: 'exec-uuid',
        source_type: 'adhoc',
        created_at: '2026-03-10T00:00:00.000Z',
        changed_at: '2026-03-10T00:00:00.000Z',
        version: 1,
        content_hash: 'hash-legacy',
      };

      esClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [{ _source: esDoc, _id: 'lead-legacy', _index: indexName }],
        },
      } as never);

      const result = await client.findLeads({ page: 1, perPage: 10 });

      expect(result.leads[0].topRelatedEntities).toEqual([]);
      expect(result.leads[0].relatedEntityCounts).toEqual({});
    });

    it('applies status filter when provided', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      } as never);

      await client.findLeads({ status: 'dismissed' });

      const searchCall = esClient.search.mock.calls[0];
      expect((searchCall[0] as Record<string, unknown>).query).toEqual({
        bool: { filter: [{ term: { status: 'dismissed' } }] },
      });
    });

    it('returns empty results when indices are unavailable', async () => {
      esClient.search.mockRejectedValueOnce(new Error('index_not_found_exception'));

      const result = await client.findLeads({});
      expect(result).toEqual({ leads: [], total: 0, page: 1, perPage: 20 });
    });

    it('returns empty results when error type is index_not_found_exception', async () => {
      const indexNotFound = {
        statusCode: 404,
        body: { error: { type: 'index_not_found_exception', reason: 'no such index' } },
        meta: { body: { error: { type: 'index_not_found_exception', reason: 'no such index' } } },
      };
      esClient.search.mockRejectedValueOnce(indexNotFound);

      const result = await client.findLeads({});
      expect(result).toEqual({ leads: [], total: 0, page: 1, perPage: 20 });
    });

    it('re-throws when ES returns security_exception so the route can return 403', async () => {
      const securityException = makeEsSecurityException();
      esClient.search.mockRejectedValueOnce(securityException);

      await expect(client.findLeads({})).rejects.toBe(securityException);
    });
  });

  describe('findLeadChanges', () => {
    it('queries and sorts by changed_at', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: { hits: [] },
      } as never);

      await client.findLeadChanges({});

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [{ changed_at: { order: 'asc' } }, { id: { order: 'asc' } }],
          query: { range: { changed_at: expect.any(Object) } },
        })
      );
    });

    it('returns a null cursor when the page is empty and no cursor was provided', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: { hits: [] },
      } as never);

      const result = await client.findLeadChanges({});

      expect(result).toEqual({ changed: [], cursor: null, hasMore: false });
    });

    it('echoes the incoming cursor when the page is empty', async () => {
      const incoming = encodeCursor(1_700_000_000_000, 'lead-last');
      esClient.search.mockResolvedValueOnce({
        hits: { hits: [] },
      } as never);

      const result = await client.findLeadChanges({ cursor: incoming });

      expect(result).toEqual({ changed: [], cursor: incoming, hasMore: false });
    });

    it('echoes the incoming cursor when the index does not exist', async () => {
      const incoming = encodeCursor(1_700_000_000_000, 'lead-last');
      esClient.search.mockRejectedValueOnce({
        statusCode: 404,
        body: { error: { type: 'index_not_found_exception', reason: 'no such index' } },
        meta: { body: { error: { type: 'index_not_found_exception', reason: 'no such index' } } },
      });

      const result = await client.findLeadChanges({ cursor: incoming });

      expect(result).toEqual({ changed: [], cursor: incoming, hasMore: false });
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
          index: indexName,
          query: { ids: { values: ['lead-1'] } },
          script: expect.objectContaining({
            params: { status: 'dismissed' },
          }),
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
      expect(call[0].query).toEqual({ ids: { values: ['a', 'b', 'c'] } });
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

    it('throws on error so the route can surface it', async () => {
      esClient.updateByQuery.mockRejectedValueOnce(new Error('cluster error'));

      await expect(client.bulkUpdateLeads(['a'], { status: 'dismissed' })).rejects.toThrow(
        'cluster error'
      );
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
              _index: indexName,
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

    it('returns defaults for any generic ES error', async () => {
      esClient.search.mockRejectedValueOnce(new Error('cluster timeout'));

      const status = await client.getStatus();
      expect(status).toEqual({
        isEnabled: false,
        indexExists: false,
        totalLeads: 0,
        lastRun: null,
      });
    });

    it('re-throws when ES returns security_exception so the route can return 403', async () => {
      const securityException = makeEsSecurityException();
      esClient.search.mockRejectedValueOnce(securityException);

      await expect(client.getStatus()).rejects.toBe(securityException);
    });
  });

  describe('deleteAllLeads', () => {
    it('deletes all docs from the index', async () => {
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
          index: indexName,
          query: { match_all: {} },
        })
      );
    });

    it('re-throws when ES returns security_exception so the disable route can return 403', async () => {
      const securityException = makeEsSecurityException();
      esClient.deleteByQuery.mockRejectedValueOnce(securityException);

      await expect(client.deleteAllLeads()).rejects.toBe(securityException);

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});
