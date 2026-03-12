/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import type { Lead } from '../../../../common/entity_analytics/lead_generation/types';
import { generateLeadContentHash, generateLeadEntityHash, deduplicateLeads } from './deduplication';

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
  contentHash: '',
  entityHash: '',
  version: 1,
  ...overrides,
});

describe('generateLeadContentHash', () => {
  const spaceId = 'default';

  it('produces a deterministic hex string', () => {
    const lead = makeTestLead();
    const hash1 = generateLeadContentHash(lead, spaceId);
    const hash2 = generateLeadContentHash(lead, spaceId);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('varies when observation type changes', () => {
    const lead1 = makeTestLead();
    const lead2 = makeTestLead({
      observations: [{ ...lead1.observations[0], type: 'risk_escalation_24h' }],
    });

    expect(generateLeadContentHash(lead1, spaceId)).not.toBe(
      generateLeadContentHash(lead2, spaceId)
    );
  });

  it('varies when observation severity changes', () => {
    const lead1 = makeTestLead();
    const lead2 = makeTestLead({
      observations: [{ ...lead1.observations[0], severity: 'critical' }],
    });

    expect(generateLeadContentHash(lead1, spaceId)).not.toBe(
      generateLeadContentHash(lead2, spaceId)
    );
  });

  it('is stable regardless of entity order', () => {
    const lead1 = makeTestLead({
      entities: [
        { type: 'user', name: 'alice' },
        { type: 'host', name: 'srv-01' },
      ],
    });
    const lead2 = makeTestLead({
      entities: [
        { type: 'host', name: 'srv-01' },
        { type: 'user', name: 'alice' },
      ],
    });

    expect(generateLeadContentHash(lead1, spaceId)).toBe(generateLeadContentHash(lead2, spaceId));
  });

  it('is stable regardless of observation order', () => {
    const obs1 = makeTestLead().observations[0];
    const obs2 = { ...obs1, moduleId: 'behavioral_analysis', type: 'alert_volume_spike' };

    const lead1 = makeTestLead({ observations: [obs1, obs2] });
    const lead2 = makeTestLead({ observations: [obs2, obs1] });

    expect(generateLeadContentHash(lead1, spaceId)).toBe(generateLeadContentHash(lead2, spaceId));
  });

  it('ignores title, description, byline (LLM-generated fields)', () => {
    const lead1 = makeTestLead({ title: 'Title A', description: 'Desc A', byline: 'By A' });
    const lead2 = makeTestLead({ title: 'Title B', description: 'Desc B', byline: 'By B' });

    expect(generateLeadContentHash(lead1, spaceId)).toBe(generateLeadContentHash(lead2, spaceId));
  });

  it('ignores score values (continuous, may fluctuate)', () => {
    const lead1 = makeTestLead();
    const lead2 = makeTestLead({
      observations: [{ ...lead1.observations[0], score: 90 }],
    });

    expect(generateLeadContentHash(lead1, spaceId)).toBe(generateLeadContentHash(lead2, spaceId));
  });

  it('varies when spaceId changes', () => {
    const lead = makeTestLead();

    expect(generateLeadContentHash(lead, 'space-a')).not.toBe(
      generateLeadContentHash(lead, 'space-b')
    );
  });

  it('varies when entity name changes', () => {
    const lead1 = makeTestLead({ entities: [{ type: 'user', name: 'alice' }] });
    const lead2 = makeTestLead({ entities: [{ type: 'user', name: 'bob' }] });

    expect(generateLeadContentHash(lead1, spaceId)).not.toBe(
      generateLeadContentHash(lead2, spaceId)
    );
  });
});

describe('generateLeadEntityHash', () => {
  const spaceId = 'default';

  it('produces a deterministic hex string', () => {
    const lead = makeTestLead();
    const hash1 = generateLeadEntityHash(lead, spaceId);
    const hash2 = generateLeadEntityHash(lead, spaceId);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is the same when only observations differ', () => {
    const lead1 = makeTestLead();
    const lead2 = makeTestLead({
      observations: [
        { ...lead1.observations[0], type: 'risk_escalation_24h', severity: 'critical' },
      ],
    });

    expect(generateLeadEntityHash(lead1, spaceId)).toBe(generateLeadEntityHash(lead2, spaceId));
  });

  it('differs when entities differ', () => {
    const lead1 = makeTestLead({ entities: [{ type: 'user', name: 'alice' }] });
    const lead2 = makeTestLead({ entities: [{ type: 'user', name: 'bob' }] });

    expect(generateLeadEntityHash(lead1, spaceId)).not.toBe(generateLeadEntityHash(lead2, spaceId));
  });

  it('is stable regardless of entity order', () => {
    const lead1 = makeTestLead({
      entities: [
        { type: 'user', name: 'alice' },
        { type: 'host', name: 'srv-01' },
      ],
    });
    const lead2 = makeTestLead({
      entities: [
        { type: 'host', name: 'srv-01' },
        { type: 'user', name: 'alice' },
      ],
    });

    expect(generateLeadEntityHash(lead1, spaceId)).toBe(generateLeadEntityHash(lead2, spaceId));
  });
});

describe('deduplicateLeads', () => {
  const spaceId = 'default';
  const indexPattern = '.internal.adhoc.entity-analytics.entity-leads.entity-default';

  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
  });

  it('returns empty buckets for empty candidates', async () => {
    const result = await deduplicateLeads({
      candidates: [],
      esClient,
      indexPattern,
      logger,
      spaceId,
    });

    expect(result).toEqual({ newLeads: [], exactDuplicateHashes: [], versionCandidates: [] });
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('returns all candidates as new when no existing leads', async () => {
    esClient.search.mockResolvedValue({
      hits: { hits: [] },
    } as never);

    const candidates = [makeTestLead()];
    const result = await deduplicateLeads({
      candidates,
      esClient,
      indexPattern,
      logger,
      spaceId,
    });

    expect(result.newLeads).toEqual(candidates);
    expect(result.exactDuplicateHashes).toEqual([]);
    expect(result.versionCandidates).toEqual([]);
  });

  it('identifies exact duplicates by content_hash', async () => {
    const lead = makeTestLead();
    const contentHash = generateLeadContentHash(lead, spaceId);

    // First search (content hash) returns a match
    esClient.search.mockResolvedValueOnce({
      hits: { hits: [{ _source: { content_hash: contentHash } }] },
    } as never);

    const result = await deduplicateLeads({
      candidates: [lead],
      esClient,
      indexPattern,
      logger,
      spaceId,
    });

    expect(result.exactDuplicateHashes).toEqual([contentHash]);
    expect(result.newLeads).toEqual([]);
    expect(result.versionCandidates).toEqual([]);
    // Only one ES search needed since all candidates were duplicates
    expect(esClient.search).toHaveBeenCalledTimes(1);
  });

  it('identifies version candidates by entity_hash match with different content', async () => {
    const lead = makeTestLead();
    const entityHash = generateLeadEntityHash(lead, spaceId);

    // First search (content hash) — no match
    esClient.search.mockResolvedValueOnce({
      hits: { hits: [] },
    } as never);
    // Second search (entity hash) — match found
    esClient.search.mockResolvedValueOnce({
      hits: { hits: [{ _source: { entity_hash: entityHash } }] },
    } as never);

    const result = await deduplicateLeads({
      candidates: [lead],
      esClient,
      indexPattern,
      logger,
      spaceId,
    });

    expect(result.versionCandidates).toEqual([lead]);
    expect(result.newLeads).toEqual([]);
    expect(result.exactDuplicateHashes).toEqual([]);
  });

  it('correctly splits mixed candidates into all three buckets', async () => {
    const existingLead = makeTestLead({ id: 'lead-existing' });
    const versionedLead = makeTestLead({
      id: 'lead-versioned',
      entities: [{ type: 'host', name: 'srv-01' }],
      observations: [
        {
          entityId: 'host:srv-01',
          moduleId: 'behavioral_analysis',
          type: 'alert_volume_spike',
          score: 60,
          severity: 'medium',
          confidence: 0.8,
          description: 'Alert spike',
          metadata: {},
        },
      ],
    });
    const newLead = makeTestLead({
      id: 'lead-new',
      entities: [{ type: 'user', name: 'newuser' }],
    });

    const existingContentHash = generateLeadContentHash(existingLead, spaceId);
    const versionedEntityHash = generateLeadEntityHash(versionedLead, spaceId);

    // Content hash search: existingLead matches
    esClient.search.mockResolvedValueOnce({
      hits: { hits: [{ _source: { content_hash: existingContentHash } }] },
    } as never);
    // Entity hash search: versionedLead matches
    esClient.search.mockResolvedValueOnce({
      hits: { hits: [{ _source: { entity_hash: versionedEntityHash } }] },
    } as never);

    const result = await deduplicateLeads({
      candidates: [existingLead, versionedLead, newLead],
      esClient,
      indexPattern,
      logger,
      spaceId,
    });

    expect(result.exactDuplicateHashes).toEqual([existingContentHash]);
    expect(result.versionCandidates).toEqual([versionedLead]);
    expect(result.newLeads).toEqual([newLead]);
  });

  it('treats all candidates as new on ES content-hash search failure', async () => {
    esClient.search.mockRejectedValueOnce(new Error('cluster error'));
    // Entity hash search succeeds but finds nothing
    esClient.search.mockResolvedValueOnce({
      hits: { hits: [] },
    } as never);

    const candidates = [makeTestLead()];
    const result = await deduplicateLeads({
      candidates,
      esClient,
      indexPattern,
      logger,
      spaceId,
    });

    expect(result.newLeads).toEqual(candidates);
    expect(result.exactDuplicateHashes).toEqual([]);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Dedup content-hash lookup failed')
    );
  });

  it('treats non-duplicates as new on ES entity-hash search failure', async () => {
    // Content hash search — no match
    esClient.search.mockResolvedValueOnce({
      hits: { hits: [] },
    } as never);
    // Entity hash search — failure
    esClient.search.mockRejectedValueOnce(new Error('timeout'));

    const candidates = [makeTestLead()];
    const result = await deduplicateLeads({
      candidates,
      esClient,
      indexPattern,
      logger,
      spaceId,
    });

    expect(result.newLeads).toEqual(candidates);
    expect(result.versionCandidates).toEqual([]);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Dedup entity-hash lookup failed')
    );
  });

  it('handles hits with missing _source gracefully', async () => {
    // Content hash search — hit without _source
    esClient.search.mockResolvedValueOnce({
      hits: { hits: [{ _id: 'orphan' }] },
    } as never);
    // Entity hash search — clean
    esClient.search.mockResolvedValueOnce({
      hits: { hits: [] },
    } as never);

    const candidates = [makeTestLead()];
    const result = await deduplicateLeads({
      candidates,
      esClient,
      indexPattern,
      logger,
      spaceId,
    });

    expect(result.newLeads).toEqual(candidates);
    expect(result.exactDuplicateHashes).toEqual([]);
  });

  it('logs info when duplicates are found', async () => {
    const lead = makeTestLead();
    const contentHash = generateLeadContentHash(lead, spaceId);

    esClient.search.mockResolvedValueOnce({
      hits: { hits: [{ _source: { content_hash: contentHash } }] },
    } as never);

    await deduplicateLeads({
      candidates: [lead],
      esClient,
      indexPattern,
      logger,
      spaceId,
    });

    expect(logger.info).toHaveBeenCalledWith(
      '[LeadGeneration] Dedup: 1 exact duplicate(s) found, skipping.'
    );
  });

  it('logs info when version candidates are found', async () => {
    const lead = makeTestLead();
    const entityHash = generateLeadEntityHash(lead, spaceId);

    esClient.search.mockResolvedValueOnce({
      hits: { hits: [] },
    } as never);
    esClient.search.mockResolvedValueOnce({
      hits: { hits: [{ _source: { entity_hash: entityHash } }] },
    } as never);

    await deduplicateLeads({
      candidates: [lead],
      esClient,
      indexPattern,
      logger,
      spaceId,
    });

    expect(logger.info).toHaveBeenCalledWith(
      '[LeadGeneration] Dedup: 1 version candidate(s) found (entity match, content changed).'
    );
  });
});
