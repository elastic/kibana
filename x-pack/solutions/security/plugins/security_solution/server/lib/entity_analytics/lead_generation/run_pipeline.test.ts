/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';

const mockListEntities = jest.fn();

const mockPrepareLeadCandidates = jest.fn();
const mockSynthesizeLeads = jest.fn();
jest.mock('./engine/lead_generation_engine', () => ({
  createLeadGenerationEngine: () => ({
    prepareLeadCandidates: mockPrepareLeadCandidates,
    synthesizeLeads: mockSynthesizeLeads,
  }),
}));

const mockRegisterObservationModules = jest.fn();
jest.mock('./observation_modules/register_modules', () => ({
  registerObservationModules: (...args: unknown[]) => mockRegisterObservationModules(...args),
}));

const mockBuildEntityLookupMap = jest.fn();
jest.mock('./entities_relationships', () => ({
  buildEntityLookupMap: (...args: unknown[]) => mockBuildEntityLookupMap(...args),
}));

const mockAttachRelatedEntities = jest.fn();
jest.mock('./attach_related_entities', () => ({
  attachRelatedEntities: (...args: unknown[]) => mockAttachRelatedEntities(...args),
}));

const mockClassifyLeadCandidates = jest.fn();
const mockPersistLeads = jest.fn();
jest.mock('./lead_data_client', () => ({
  createLeadDataClient: () => ({
    classifyLeadCandidates: mockClassifyLeadCandidates,
    persistLeads: mockPersistLeads,
  }),
}));

const mockBuildExploratoryLeads = jest.fn();
jest.mock('./exploratory_leads', () => ({
  buildExploratoryLeads: (...args: unknown[]) => mockBuildExploratoryLeads(...args),
}));

import { riskScoreDataClientMock } from '../risk_score/risk_score_data_client.mock';
import { runLeadGenerationPipeline } from './run_pipeline';

describe('runLeadGenerationPipeline', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const riskScoreDataClient = riskScoreDataClientMock.create();
  const fakeChatModel = { invoke: jest.fn() } as unknown as InferenceChatModel;
  const relationshipsClient = { getEarliestObservationByTarget: jest.fn() };

  const pipelineParams = {
    listEntities: mockListEntities,
    esClient,
    logger,
    spaceId: 'default' as const,
    riskScoreDataClient,
    chatModel: fakeChatModel,
    relationshipsClient: relationshipsClient as never,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockSynthesizeLeads.mockResolvedValue([]);
    mockPersistLeads.mockResolvedValue(0);
    mockBuildEntityLookupMap.mockImplementation(
      async (entities: Array<{ id: string }>) => new Map(entities.map((e) => [e.id, e]))
    );
    mockAttachRelatedEntities.mockImplementation(
      async ({ candidates }: { candidates: unknown[] }) => candidates
    );
    mockBuildExploratoryLeads.mockResolvedValue([]);
  });

  it('returns early when no entities are found', async () => {
    mockListEntities.mockResolvedValueOnce([]);

    await runLeadGenerationPipeline({
      ...pipelineParams,
      sourceType: 'scheduled',
    });

    expect(mockListEntities).toHaveBeenCalled();
    expect(mockRegisterObservationModules).not.toHaveBeenCalled();
    expect(mockPrepareLeadCandidates).not.toHaveBeenCalled();
    expect(mockSynthesizeLeads).not.toHaveBeenCalled();
  });

  it('degrades to a candidates-only entity lookup map when buildEntityLookupMap throws', async () => {
    const mockEntity = {
      record: { entity: { type: 'user', name: 'testuser', id: 'euid-testuser' } },
      type: 'user',
      name: 'testuser',
      id: 'user:testuser',
    };
    mockListEntities.mockResolvedValueOnce([mockEntity]);
    mockBuildEntityLookupMap.mockRejectedValueOnce(new Error('es unavailable'));

    const candidate = {
      entity: mockEntity,
      priority: 5,
      observations: [],
      leadId: hashEuid(mockEntity.id),
      topRelatedEntities: [],
      relatedEntityCounts: {},
      contentHash: 'hash-fallback',
    };
    mockPrepareLeadCandidates.mockResolvedValueOnce({ confident: [candidate], exploratory: [] });
    mockClassifyLeadCandidates.mockResolvedValueOnce([{ candidate, decision: { type: 'skip' } }]);

    await runLeadGenerationPipeline({
      ...pipelineParams,
      sourceType: 'adhoc',
    });

    expect(mockRegisterObservationModules).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entitiesMap: new Map([[mockEntity.id, mockEntity]]),
      })
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  it('continues with unmodified candidates when attachRelatedEntities throws', async () => {
    const mockEntity = {
      record: { entity: { type: 'user', name: 'testuser', id: 'euid-testuser' } },
      type: 'user',
      name: 'testuser',
      id: 'user:testuser',
    };
    mockListEntities.mockResolvedValueOnce([mockEntity]);
    mockAttachRelatedEntities.mockRejectedValueOnce(new Error('ranking failed'));

    const candidate = {
      entity: mockEntity,
      priority: 5,
      observations: [],
      leadId: hashEuid(mockEntity.id),
      topRelatedEntities: [],
      relatedEntityCounts: {},
      contentHash: 'hash-attach-fallback',
    };
    mockPrepareLeadCandidates.mockResolvedValueOnce({ confident: [candidate], exploratory: [] });
    mockClassifyLeadCandidates.mockResolvedValueOnce([{ candidate, decision: { type: 'skip' } }]);

    await runLeadGenerationPipeline({
      ...pipelineParams,
      sourceType: 'adhoc',
    });

    expect(mockClassifyLeadCandidates).toHaveBeenCalledWith([candidate]);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('skips LLM for refresh candidates and only stamps timestamps', async () => {
    const mockEntity = {
      record: {
        entity: {
          type: 'user',
          name: 'testuser',
          id: 'euid-testuser',
          risk: { calculated_score_norm: 75 },
        },
      },
      type: 'user',
      name: 'testuser',
      id: 'user:testuser',
    };
    mockListEntities.mockResolvedValueOnce([mockEntity]);

    const candidate = {
      entity: mockEntity,
      priority: 5,
      observations: [
        {
          entityId: 'user:testuser',
          moduleId: 'risk_analysis',
          type: 'high_risk_score',
          score: 80,
          severity: 'high' as const,
          confidence: 0.9,
          description: 'high risk',
          metadata: {},
        },
      ],
      leadId: 'entity-key-1',
      topRelatedEntities: [
        { id: 'host:shared', type: 'host', name: 'shared', kinds: ['communicates_with'] },
      ],
      relatedEntityCounts: { communicates_with: 3 },
      contentHash: 'hash-1',
    };
    mockPrepareLeadCandidates.mockResolvedValueOnce({ confident: [candidate], exploratory: [] });
    mockClassifyLeadCandidates.mockResolvedValueOnce([
      { candidate, decision: { type: 'refresh', existingId: 'existing-lead' } },
    ]);

    await runLeadGenerationPipeline({
      ...pipelineParams,
      sourceType: 'adhoc',
      executionId: 'exec-123',
    });

    expect(mockSynthesizeLeads).toHaveBeenCalledWith([], expect.any(Object));
    expect(mockPersistLeads).toHaveBeenCalledWith(
      expect.objectContaining({
        executionId: 'exec-123',
        sourceType: 'adhoc',
        refreshes: [
          {
            existingId: 'existing-lead',
            topRelatedEntities: candidate.topRelatedEntities,
            relatedEntityCounts: candidate.relatedEntityCounts,
          },
        ],
        creates: [],
        updates: [],
      })
    );
  });

  it('runs the full pipeline for creates and returns counts', async () => {
    const mockEntity = {
      record: {
        entity: {
          type: 'user',
          name: 'testuser',
          id: 'euid-testuser',
          risk: { calculated_score_norm: 75 },
        },
      },
      type: 'user',
      name: 'testuser',
      id: 'user:testuser',
    };
    mockListEntities.mockResolvedValueOnce([mockEntity]);

    const candidate = {
      entity: mockEntity,
      priority: 5,
      observations: [],
      leadId: hashEuid(mockEntity.id),
      topRelatedEntities: [],
      relatedEntityCounts: {},
      contentHash: 'hash-create',
    };
    mockPrepareLeadCandidates.mockResolvedValueOnce({ confident: [candidate], exploratory: [] });
    mockClassifyLeadCandidates.mockResolvedValueOnce([{ candidate, decision: { type: 'create' } }]);

    const mockLead = {
      id: 'lead-1',
      title: 'Test Lead',
      byline: '',
      description: '',
      entity: mockEntity,
      tags: [],
      priority: 5,
      chatRecommendations: [],
      timestamp: '2026-03-10T00:00:00.000Z',
      staleness: 'fresh',
      observations: [],
    };
    mockSynthesizeLeads.mockResolvedValueOnce([mockLead]);

    await runLeadGenerationPipeline({
      ...pipelineParams,
      sourceType: 'adhoc',
      executionId: 'exec-123',
    });

    expect(mockRegisterObservationModules).toHaveBeenCalledWith(
      expect.objectContaining({
        prepareLeadCandidates: mockPrepareLeadCandidates,
        synthesizeLeads: mockSynthesizeLeads,
      }),
      expect.objectContaining({
        logger,
        esClient,
        spaceId: 'default',
        riskScoreDataClient,
        relationshipsClient,
        entitiesMap: new Map([[mockEntity.id, mockEntity]]),
      })
    );
    expect(mockSynthesizeLeads).toHaveBeenCalledWith(
      [candidate],
      expect.objectContaining({ chatModel: fakeChatModel })
    );
    expect(mockPersistLeads).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: 'adhoc',
        executionId: 'exec-123',
        creates: [
          expect.objectContaining({
            id: mockLead.id,
          }),
        ],
        updates: [],
        refreshes: [],
      })
    );
    const persisted = mockPersistLeads.mock.calls[0][0].creates[0];
    expect(persisted).not.toHaveProperty('contentHash');
    expect(persisted).not.toHaveProperty('leadId');
    expect(persisted).not.toHaveProperty('status');
    expect(persisted).not.toHaveProperty('version');
    expect(persisted).not.toHaveProperty('createdAt');
    expect(persisted).not.toHaveProperty('changedAt');
    expect(persisted).not.toHaveProperty('executionUuid');
    expect(persisted).not.toHaveProperty('sourceType');
  });

  it('synthesizes and updates when content hash changed', async () => {
    const mockEntity = {
      record: {
        entity: { type: 'user', name: 'admin', id: 'euid-admin' },
      },
      type: 'user',
      name: 'admin',
      id: 'user:admin',
    };
    mockListEntities.mockResolvedValueOnce([mockEntity]);

    const candidate = {
      entity: mockEntity,
      priority: 8,
      observations: [],
      leadId: hashEuid(mockEntity.id),
      topRelatedEntities: [],
      relatedEntityCounts: {},
      contentHash: 'hash-new',
    };
    mockPrepareLeadCandidates.mockResolvedValueOnce({ confident: [candidate], exploratory: [] });
    mockClassifyLeadCandidates.mockResolvedValueOnce([
      {
        candidate,
        decision: { type: 'update', existingId: 'existing-admin', allowReopen: false },
      },
    ]);
    mockSynthesizeLeads.mockResolvedValueOnce([
      {
        id: 'lead-new',
        title: 'Updated',
        byline: '',
        description: '',
        entity: mockEntity,
        tags: [],
        priority: 8,
        chatRecommendations: [],
        timestamp: '2026-03-10T00:00:00.000Z',
        staleness: 'fresh',
        observations: [],
      },
    ]);

    await runLeadGenerationPipeline({
      ...pipelineParams,
      spaceId: 'test-space',
      sourceType: 'scheduled',
    });

    expect(mockPersistLeads).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: 'scheduled',
        updates: [
          expect.objectContaining({
            existingId: 'existing-admin',
            lead: expect.objectContaining({ id: 'lead-new' }),
          }),
        ],
        creates: [],
        refreshes: [],
      })
    );
  });

  it('does not synthesize dismissed same-hash candidates', async () => {
    const mockEntity = {
      record: {
        entity: { type: 'user', name: 'dismissed', id: 'euid-d' },
      },
      type: 'user',
      name: 'dismissed',
      id: 'user:dismissed',
    };
    mockListEntities.mockResolvedValueOnce([mockEntity]);

    const candidate = {
      entity: mockEntity,
      priority: 3,
      observations: [],
      leadId: 'entity-key-d',
      topRelatedEntities: [],
      relatedEntityCounts: {},
      contentHash: 'hash-d',
    };
    mockPrepareLeadCandidates.mockResolvedValueOnce({ confident: [candidate], exploratory: [] });
    mockClassifyLeadCandidates.mockResolvedValueOnce([{ candidate, decision: { type: 'skip' } }]);

    await runLeadGenerationPipeline({
      ...pipelineParams,
      sourceType: 'adhoc',
    });

    expect(mockSynthesizeLeads).toHaveBeenCalledWith([], expect.any(Object));
    expect(mockPersistLeads).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshes: [],
        creates: [],
        updates: [],
      })
    );
  });

  it('reports telemetry from prepared candidate count and persist buckets', async () => {
    const mockEntity = {
      record: {
        entity: { type: 'user', name: 'telemetry', id: 'euid-t' },
      },
      type: 'user',
      name: 'telemetry',
      id: 'user:telemetry',
    };
    mockListEntities.mockResolvedValueOnce([mockEntity]);

    const createCandidate = {
      entity: mockEntity,
      priority: 5,
      observations: [],
      leadId: hashEuid(mockEntity.id),
      topRelatedEntities: [],
      relatedEntityCounts: {},
      contentHash: 'hash-create',
    };
    const skipCandidate = {
      ...createCandidate,
      leadId: 'entity-key-skip',
      contentHash: 'hash-skip',
    };
    const resurfaceCandidate = {
      ...createCandidate,
      leadId: 'entity-key-resurface',
      contentHash: 'hash-resurface',
    };

    mockPrepareLeadCandidates.mockResolvedValueOnce({
      confident: [createCandidate, skipCandidate, resurfaceCandidate],
      exploratory: [],
    });
    mockClassifyLeadCandidates.mockResolvedValueOnce([
      { candidate: createCandidate, decision: { type: 'create' } },
      { candidate: skipCandidate, decision: { type: 'skip' } },
      {
        candidate: resurfaceCandidate,
        decision: { type: 'refresh', existingId: 'existing-resurface' },
      },
    ]);
    mockSynthesizeLeads.mockResolvedValueOnce([
      {
        id: 'lead-1',
        title: 'Test Lead',
        byline: '',
        description: '',
        entity: mockEntity,
        tags: [],
        priority: 5,
        chatRecommendations: [],
        timestamp: '2026-03-10T00:00:00.000Z',
        staleness: 'fresh',
        observations: [],
      },
    ]);

    const analytics = { reportEvent: jest.fn() };

    await runLeadGenerationPipeline({
      ...pipelineParams,
      sourceType: 'scheduled',
      analytics: analytics as never,
    });

    expect(analytics.reportEvent).toHaveBeenCalledWith('lead_generation_execution', {
      spaceId: 'default',
      leadsGenerated: 3,
      newLeads: 1,
      revisedLeads: 0,
      resurfacedLeads: 1,
      skippedLeads: 1,
      failedLeads: 0,
      sourceType: 'scheduled',
    });
  });

  it('merges an exploratory lead into classify/synthesize alongside confident ones', async () => {
    const confidentEntity = {
      record: { entity: { type: 'user', name: 'confident-user', id: 'euid-confident' } },
      type: 'user',
      name: 'confident-user',
      id: 'user:confident',
    };
    const exploratoryEntity = {
      record: { entity: { type: 'host', name: 'exploratory-host', id: 'euid-exploratory' } },
      type: 'host',
      name: 'exploratory-host',
      id: 'host:exploratory',
    };
    mockListEntities.mockResolvedValueOnce([confidentEntity, exploratoryEntity]);

    const confidentCandidate = {
      entity: confidentEntity,
      priority: 5,
      observations: [],
      leadId: hashEuid(confidentEntity.id),
      topRelatedEntities: [],
      relatedEntityCounts: {},
    };
    const exploratoryCandidate = {
      entity: exploratoryEntity,
      priority: 1,
      observations: [],
      leadId: hashEuid(exploratoryEntity.id),
      topRelatedEntities: [],
      relatedEntityCounts: {},
    };
    mockPrepareLeadCandidates.mockResolvedValueOnce({
      confident: [confidentCandidate],
      exploratory: [exploratoryCandidate],
    });
    mockBuildExploratoryLeads.mockResolvedValueOnce([
      {
        ...exploratoryCandidate,
        promotionReason: 'administers a critical host',
        promotionConfidence: 'high',
      },
    ]);
    mockClassifyLeadCandidates.mockResolvedValueOnce([
      { candidate: confidentCandidate, decision: { type: 'create' } },
      {
        candidate: {
          ...exploratoryCandidate,
          promotionReason: 'administers a critical host',
          promotionConfidence: 'high',
        },
        decision: { type: 'create' },
      },
    ]);

    await runLeadGenerationPipeline({
      ...pipelineParams,
      sourceType: 'adhoc',
    });

    expect(mockBuildExploratoryLeads).toHaveBeenCalledWith(
      [exploratoryCandidate],
      expect.objectContaining({ chatModel: fakeChatModel })
    );
    expect(mockClassifyLeadCandidates).toHaveBeenCalledWith([
      confidentCandidate,
      expect.objectContaining({
        entity: exploratoryEntity,
        promotionReason: 'administers a critical host',
        promotionConfidence: 'high',
      }),
    ]);
  });

  it('persists confident leads unaffected when buildExploratoryLeads returns nothing', async () => {
    const mockEntity = {
      record: { entity: { type: 'user', name: 'testuser', id: 'euid-testuser' } },
      type: 'user',
      name: 'testuser',
      id: 'user:testuser',
    };
    mockListEntities.mockResolvedValueOnce([mockEntity]);

    const candidate = {
      entity: mockEntity,
      priority: 5,
      observations: [],
      leadId: hashEuid(mockEntity.id),
      topRelatedEntities: [],
      relatedEntityCounts: {},
    };
    mockPrepareLeadCandidates.mockResolvedValueOnce({ confident: [candidate], exploratory: [] });
    mockBuildExploratoryLeads.mockResolvedValueOnce([]);
    mockClassifyLeadCandidates.mockResolvedValueOnce([{ candidate, decision: { type: 'create' } }]);
    mockSynthesizeLeads.mockResolvedValueOnce([
      {
        id: 'lead-1',
        title: 'Test Lead',
        byline: '',
        description: '',
        entity: mockEntity,
        tags: [],
        priority: 5,
        chatRecommendations: [],
        timestamp: '2026-03-10T00:00:00.000Z',
        staleness: 'fresh',
        observations: [],
      },
    ]);

    await runLeadGenerationPipeline({
      ...pipelineParams,
      sourceType: 'adhoc',
    });

    expect(mockClassifyLeadCandidates).toHaveBeenCalledWith([candidate]);
    expect(mockPersistLeads).toHaveBeenCalledWith(
      expect.objectContaining({
        creates: [expect.objectContaining({ id: 'lead-1' })],
      })
    );
  });
});
