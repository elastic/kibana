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
import { computeContentHash, computeEntityIdentityKey } from './content_hash';

const makeEsSecurityException = () => ({
  statusCode: 403,
  body: { error: { type: 'security_exception', reason: 'access denied' } },
  meta: { body: { error: { type: 'security_exception', reason: 'access denied' } } },
});

const makeTestLead = (overrides: Partial<Lead> = {}): Lead => {
  const entities = overrides.entities ?? [{ type: 'user', name: 'admin', id: 'user:admin' }];
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
    status: 'active',
    executionUuid: '550e8400-e29b-41d4-a716-446655440000',
    sourceType: 'adhoc',
    ...overrides,
    entities,
    observations,
    timestamp,
    createdAt: overrides.createdAt ?? timestamp,
    updatedAt: overrides.updatedAt ?? timestamp,
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

  /** Mirrors run_pipeline: classify then persist (tests pass pre-built Lead docs). */
  const classifyAndPersist = async (
    leads: Lead[],
    executionId: string,
    sourceType: 'adhoc' | 'scheduled' = 'adhoc'
  ) => {
    if (leads.length === 0) {
      return;
    }
    const candidates = leads.map((lead) => ({
      lead,
      entityIdentityKey: computeEntityIdentityKey({ entities: lead.entities }),
      contentHash: computeContentHash({ observations: lead.observations }),
    }));
    const decisions = await client.classifyLeadCandidates(candidates);

    const dedups: Array<{ existingId: string }> = [];
    const creates: Lead[] = [];
    const versions: Array<{ existingId: string; lead: Lead }> = [];

    for (const { candidate, decision } of decisions) {
      if (decision.type === 'dedup') {
        dedups.push({ existingId: decision.existingId });
      } else if (decision.type === 'version') {
        versions.push({ existingId: decision.existingId, lead: candidate.lead });
      } else if (decision.type === 'create') {
        creates.push(candidate.lead);
      }
    }

    await client.persistLeads({
      executionId,
      sourceType,
      timestamp: leads[0].timestamp,
      dedups,
      creates,
      versions,
    });
  };

  describe('classifyLeadCandidates + persistLeads', () => {
    it('creates a new lead when no active lead exists for the entity', async () => {
      const lead = makeTestLead();
      const entityKey = computeEntityIdentityKey({ entities: lead.entities });
      const contentHash = computeContentHash({ observations: lead.observations });

      esClient.mget.mockResolvedValueOnce({
        docs: [{ _id: entityKey, found: false }],
      } as never);
      esClient.bulk.mockResolvedValueOnce({ errors: false, items: [], took: 1 });

      await classifyAndPersist([lead], 'exec-1');

      expect(esClient.mget).toHaveBeenCalledWith(
        expect.objectContaining({
          index: indexName,
          ids: [entityKey],
          _source: ['content_hash', 'entity_identity_key', 'version', 'status'],
        })
      );
      expect(esClient.mget).toHaveBeenCalledTimes(1);
      expect(esClient.search).not.toHaveBeenCalled();

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      const body = esClient.bulk.mock.calls[0][0].body as unknown[];
      expect(body[0]).toEqual({
        update: { _index: indexName, _id: entityKey, retry_on_conflict: 3 },
      });
      const upsert = body[1] as {
        script: { source: string; params: Record<string, unknown> };
        upsert: Record<string, unknown>;
      };
      expect(upsert.script.source).toContain('ctx._source.content_hash == params.content_hash');
      expect(upsert.script.source).toContain("ctx._source.status == 'dismissed'");
      expect(upsert.script.source).toContain("ctx.op = 'noop'");
      expect(upsert.upsert.id).toBe(entityKey);
      expect(upsert.upsert.content_hash).toBe(contentHash);
      expect(upsert.upsert.entity_identity_key).toBe(entityKey);
      expect(upsert.upsert.version).toBe(1);
      expect(upsert.upsert.chat_recommendations).toEqual(lead.chatRecommendations);
      expect(upsert.upsert.execution_uuid).toBe('exec-1');
      expect(upsert.upsert).not.toHaveProperty('chatRecommendations');
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('dedups when an active lead with the same content hash exists', async () => {
      const lead = makeTestLead();
      const entityKey = computeEntityIdentityKey({ entities: lead.entities });
      const contentHash = computeContentHash({ observations: lead.observations });

      esClient.mget.mockResolvedValueOnce({
        docs: [
          {
            _id: entityKey,
            found: true,
            _source: {
              content_hash: contentHash,
              entity_identity_key: entityKey,
              version: 1,
              status: 'active',
            },
          },
        ],
      } as never);
      esClient.bulk.mockResolvedValueOnce({ errors: false, items: [], took: 1 });

      await classifyAndPersist([lead], 'exec-dedup');

      const body = esClient.bulk.mock.calls[0][0].body as unknown[];
      expect(body[0]).toEqual({
        update: {
          _index: indexName,
          _id: entityKey,
          retry_on_conflict: 3,
        },
      });
      expect(body[1]).toEqual({
        doc: {
          timestamp: lead.timestamp,
          status: 'active',
          updated_at: lead.timestamp,
          execution_uuid: 'exec-dedup',
          source_type: 'adhoc',
        },
      });
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Deduped lead ${entityKey}`)
      );
      expect(esClient.mget).toHaveBeenCalledTimes(1);
    });

    it('resurfaces an expired lead with the same content hash as active', async () => {
      const lead = makeTestLead();
      const entityKey = computeEntityIdentityKey({ entities: lead.entities });
      const contentHash = computeContentHash({ observations: lead.observations });

      esClient.mget.mockResolvedValueOnce({
        docs: [
          {
            _id: entityKey,
            found: true,
            _source: {
              content_hash: contentHash,
              entity_identity_key: entityKey,
              version: 2,
              status: 'expired',
            },
          },
        ],
      } as never);
      esClient.bulk.mockResolvedValueOnce({ errors: false, items: [], took: 1 });

      await classifyAndPersist([lead], 'exec-expired-dedup');

      const body = esClient.bulk.mock.calls[0][0].body as unknown[];
      expect(body[0]).toEqual({
        update: {
          _index: indexName,
          _id: entityKey,
          retry_on_conflict: 3,
        },
      });
      expect(body[1]).toEqual({
        doc: {
          timestamp: lead.timestamp,
          status: 'active',
          updated_at: lead.timestamp,
          execution_uuid: 'exec-expired-dedup',
          source_type: 'adhoc',
        },
      });
    });

    it('versions an expired lead when the content hash differs and sets status active', async () => {
      const lead = makeTestLead({
        observations: [
          {
            entityId: 'user:admin',
            moduleId: 'risk_analysis',
            type: 'high_risk_score',
            score: 85,
            severity: 'high',
            confidence: 0.9,
            description: 'Risk score is 85',
            metadata: {},
          },
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
      const entityKey = computeEntityIdentityKey({ entities: lead.entities });
      const contentHash = computeContentHash({ observations: lead.observations });
      const oldHash = computeContentHash({ observations: [lead.observations[0]] });

      esClient.mget.mockResolvedValueOnce({
        docs: [
          {
            _id: entityKey,
            found: true,
            _source: {
              content_hash: oldHash,
              entity_identity_key: entityKey,
              version: 1,
              status: 'expired',
            },
          },
        ],
      } as never);
      esClient.bulk.mockResolvedValueOnce({ errors: false, items: [], took: 1 });

      await classifyAndPersist([lead], 'exec-expired-version');

      const body = esClient.bulk.mock.calls[0][0].body as unknown[];
      expect(body[0]).toEqual({
        update: { _index: indexName, _id: entityKey, retry_on_conflict: 3 },
      });
      const update = body[1] as { script: { params: Record<string, unknown> } };
      expect(update.script.params.content_hash).toBe(contentHash);
      expect(update.script.params.status).toBe('active');
    });

    it('versions an existing active lead when the content hash differs', async () => {
      const lead = makeTestLead({
        title: 'Updated narrative',
        observations: [
          {
            entityId: 'user:admin',
            moduleId: 'risk_analysis',
            type: 'high_risk_score',
            score: 85,
            severity: 'high',
            confidence: 0.9,
            description: 'Risk score is 85',
            metadata: {},
          },
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
      const entityKey = computeEntityIdentityKey({ entities: lead.entities });
      const contentHash = computeContentHash({ observations: lead.observations });
      const oldHash = computeContentHash({
        observations: [lead.observations[0]],
      });

      esClient.mget.mockResolvedValueOnce({
        docs: [
          {
            _id: entityKey,
            found: true,
            _source: {
              content_hash: oldHash,
              entity_identity_key: entityKey,
              version: 1,
              status: 'active',
            },
          },
        ],
      } as never);
      esClient.bulk.mockResolvedValueOnce({ errors: false, items: [], took: 1 });

      await classifyAndPersist([lead], 'exec-version');

      const body = esClient.bulk.mock.calls[0][0].body as unknown[];
      expect(body[0]).toEqual({
        update: { _index: indexName, _id: entityKey, retry_on_conflict: 3 },
      });
      const update = body[1] as {
        script: { source: string; params: Record<string, unknown> };
      };
      expect(update.script.source).toContain('ctx._source.observations = params.observations');
      expect(update.script.source).toContain(
        'ctx._source.entity_identity_key = params.entity_identity_key'
      );
      expect(update.script.source).not.toContain('existingKeys');
      expect(update.script.source).toContain('ctx._source.version');
      expect(update.script.source).toContain('ctx._source.title');
      expect(update.script.source).toContain('ctx._source.status = params.status');
      expect(update.script.source).toContain("ctx.op = 'noop'");
      expect(update.script.params.content_hash).toBe(contentHash);
      expect(update.script.params.title).toBe(lead.title);
      expect(update.script.params.status).toBe('active');
      expect(update.script.params.observations).toHaveLength(2);
      expect(oldHash).not.toBe(contentHash);
      expect(esClient.mget).toHaveBeenCalledTimes(1);
    });

    it('skips creation when a dismissed lead has the same content hash', async () => {
      const lead = makeTestLead();
      const entityKey = computeEntityIdentityKey({ entities: lead.entities });
      const contentHash = computeContentHash({ observations: lead.observations });

      esClient.mget.mockResolvedValueOnce({
        docs: [
          {
            _id: entityKey,
            found: true,
            _source: {
              content_hash: contentHash,
              entity_identity_key: entityKey,
              version: 1,
              status: 'dismissed',
            },
          },
        ],
      } as never);

      await classifyAndPersist([lead], 'exec-dismissed-same');

      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(esClient.mget).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Lead previously dismissed')
      );
    });

    it('reactivates a dismissed lead when the content hash differs', async () => {
      const lead = makeTestLead({
        observations: [
          {
            entityId: 'user:admin',
            moduleId: 'risk_analysis',
            type: 'high_risk_score',
            score: 85,
            severity: 'high',
            confidence: 0.9,
            description: 'Risk score is 85',
            metadata: {},
          },
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
      const entityKey = computeEntityIdentityKey({ entities: lead.entities });
      const contentHash = computeContentHash({ observations: lead.observations });
      const oldHash = computeContentHash({
        observations: [lead.observations[0]],
      });

      esClient.mget.mockResolvedValueOnce({
        docs: [
          {
            _id: entityKey,
            found: true,
            _source: {
              content_hash: oldHash,
              entity_identity_key: entityKey,
              version: 1,
              status: 'dismissed',
            },
          },
        ],
      } as never);
      esClient.bulk.mockResolvedValueOnce({ errors: false, items: [], took: 1 });

      await classifyAndPersist([lead], 'exec-dismissed-new');

      const body = esClient.bulk.mock.calls[0][0].body as unknown[];
      expect(body[0]).toEqual({
        update: { _index: indexName, _id: entityKey, retry_on_conflict: 3 },
      });
      const update = body[1] as {
        script: { params: Record<string, unknown> };
      };
      expect(update.script.params.content_hash).toBe(contentHash);
      expect(update.script.params.status).toBe('active');
      expect(update.script.params.id).toBe(entityKey);
      expect(oldHash).not.toBe(contentHash);
      expect(esClient.mget).toHaveBeenCalledTimes(1);
    });

    it('creates with scripted upsert so concurrent writers share one document id', async () => {
      const lead = makeTestLead();
      const entityKey = computeEntityIdentityKey({ entities: lead.entities });

      esClient.bulk.mockResolvedValueOnce({ errors: false, items: [], took: 1 });

      await client.persistLeads({
        executionId: 'exec-upsert',
        sourceType: 'adhoc',
        timestamp: lead.timestamp,
        dedups: [],
        creates: [lead],
        versions: [],
      });

      const body = esClient.bulk.mock.calls[0][0].body as unknown[];
      expect(body[0]).toEqual({
        update: { _index: indexName, _id: entityKey, retry_on_conflict: 3 },
      });
      const upsert = body[1] as {
        script: { source: string };
        upsert: { id: string };
      };
      expect(upsert.upsert.id).toBe(entityKey);
      expect(upsert.script.source).toContain('content_hash == params.content_hash');
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
    });

    it('preserves the entity EUID (`entities[].id`) when persisting', async () => {
      const lead = makeTestLead({
        entities: [
          {
            type: 'host',
            name: '8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
            id: 'host:8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
          },
        ],
      });
      const entityKey = computeEntityIdentityKey({ entities: lead.entities });

      esClient.mget.mockResolvedValueOnce({
        docs: [{ _id: entityKey, found: false }],
      } as never);
      esClient.bulk.mockResolvedValueOnce({ errors: false, items: [], took: 1 });

      await classifyAndPersist([lead], 'exec-euid');

      const body = esClient.bulk.mock.calls[0][0].body as unknown[];
      const upsert = body[1] as { upsert: Record<string, unknown> };
      expect(upsert.upsert.entities).toEqual([
        {
          type: 'host',
          name: '8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
          id: 'host:8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
        },
      ]);
    });

    it('skips work when leads array is empty', async () => {
      await classifyAndPersist([], 'exec-3');

      expect(esClient.mget).not.toHaveBeenCalled();
      expect(esClient.search).not.toHaveBeenCalled();
      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('logs a warning and does not throw on persistence failure', async () => {
      const lead = makeTestLead();
      const entityKey = computeEntityIdentityKey({ entities: lead.entities });
      esClient.mget.mockResolvedValueOnce({
        docs: [{ _id: entityKey, found: false }],
      } as never);
      esClient.bulk.mockRejectedValueOnce(new Error('ES unavailable'));

      await expect(classifyAndPersist([lead], 'exec-4')).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to persist leads'));
    });

    it('returns the failed item count when bulk has errors', async () => {
      const leadOk = makeTestLead({
        entities: [{ type: 'user', name: 'a', id: 'user:a' }],
      });
      const leadFail = makeTestLead({
        entities: [{ type: 'user', name: 'b', id: 'user:b' }],
      });
      const okKey = computeEntityIdentityKey({ entities: leadOk.entities });
      const failKey = computeEntityIdentityKey({ entities: leadFail.entities });

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
        dedups: [],
        creates: [leadOk, leadFail],
        versions: [],
      });

      expect(result).toBe(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Bulk update had 1/2 failures')
      );
    });

    it('returns the action count when the bulk call throws a non-security error', async () => {
      esClient.bulk.mockRejectedValueOnce(new Error('ES unavailable'));

      const lead = makeTestLead();
      const result = await client.persistLeads({
        executionId: 'exec-throw',
        sourceType: 'adhoc',
        timestamp: lead.timestamp,
        dedups: [],
        creates: [lead],
        versions: [],
      });

      expect(result).toBe(1);
    });

    it('re-throws when ES returns security_exception so callers can surface the 403', async () => {
      const securityException = makeEsSecurityException();
      esClient.mget.mockRejectedValueOnce(securityException);

      await expect(classifyAndPersist([makeTestLead()], 'exec-5')).rejects.toBe(securityException);

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
        entities: [{ type: 'user', name: 'admin', id: 'user:admin' }],
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
        updated_at: '2026-03-10T00:00:00.000Z',
        version: 1,
        content_hash: 'abc123',
        entity_identity_key: 'def456',
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
      expect(lead).not.toHaveProperty('contentHash');
      expect(lead).not.toHaveProperty('version');
      expect(lead.observations[0].entityId).toBe('user:admin');
    });

    it('reads the entity EUID (`entities[].id`) back from the stored document', async () => {
      const esDoc = {
        id: 'lead-euid',
        title: 'Test Lead',
        byline: 'Entity X',
        description: 'Details',
        entities: [
          {
            type: 'host',
            name: '8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
            id: 'host:8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
          },
        ],
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
        updated_at: '2026-03-10T00:00:00.000Z',
        version: 1,
        content_hash: 'hash',
        entity_identity_key: 'key',
      };

      esClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [{ _source: esDoc, _id: 'lead-euid', _index: indexName }],
        },
      } as never);

      const result = await client.findLeads({ page: 1, perPage: 10 });

      expect(result.leads[0].entities).toEqual([
        {
          type: 'host',
          name: '8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
          id: 'host:8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
        },
      ]);
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

  describe('dismissLead', () => {
    it('sets status to dismissed via updateByQuery and bumps updated_at', async () => {
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
            params: expect.objectContaining({ status: 'dismissed' }),
          }),
        })
      );
      const script = esClient.updateByQuery.mock.calls[0][0].script as {
        params: { updatedAt: string };
      };
      expect(script.params.updatedAt).toEqual(expect.any(String));
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
    it('updates multiple leads by ids and bumps updated_at', async () => {
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
          params: expect.objectContaining({ status: 'dismissed' }),
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
