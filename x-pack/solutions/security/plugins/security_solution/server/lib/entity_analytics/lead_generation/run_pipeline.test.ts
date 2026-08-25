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
const mockRegisterModule = jest.fn();
jest.mock('./engine/lead_generation_engine', () => ({
  createLeadGenerationEngine: () => ({
    registerModule: mockRegisterModule,
    prepareLeadCandidates: mockPrepareLeadCandidates,
    synthesizeLeads: mockSynthesizeLeads,
  }),
}));

jest.mock('./observation_modules/risk_score_module', () => ({
  createRiskScoreModule: jest.fn(() => ({ config: { id: 'risk' } })),
}));
jest.mock('./observation_modules/temporal_state_module', () => ({
  createTemporalStateModule: jest.fn(() => ({ config: { id: 'temporal' } })),
}));
jest.mock('./observation_modules/behavioral_analysis_module', () => ({
  createBehavioralAnalysisModule: jest.fn(() => ({ config: { id: 'alert' } })),
}));
jest.mock('./observation_modules/entity_profile_module', () => ({
  createEntityProfileModule: jest.fn(() => ({ config: { id: 'entity_profile' } })),
}));
jest.mock('./observation_modules/anomaly_detection_module', () => ({
  createAnomalyDetectionModule: jest.fn(() => ({ config: { id: 'anomaly_detection' } })),
}));

const mockClassifyLeadCandidates = jest.fn();
const mockPersistLeads = jest.fn();
jest.mock('./lead_data_client', () => ({
  createLeadDataClient: () => ({
    classifyLeadCandidates: mockClassifyLeadCandidates,
    persistLeads: mockPersistLeads,
  }),
}));

import { riskScoreDataClientMock } from '../risk_score/risk_score_data_client.mock';
import { runLeadGenerationPipeline } from './run_pipeline';

describe('runLeadGenerationPipeline', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const riskScoreDataClient = riskScoreDataClientMock.create();
  const fakeChatModel = { invoke: jest.fn() } as unknown as InferenceChatModel;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockSynthesizeLeads.mockResolvedValue([]);
    mockPersistLeads.mockResolvedValue(0);
  });

  it('returns early when no entities are found', async () => {
    mockListEntities.mockResolvedValueOnce([]);

    await runLeadGenerationPipeline({
      listEntities: mockListEntities,
      esClient,
      logger,
      spaceId: 'default',
      riskScoreDataClient,
      sourceType: 'scheduled',
      chatModel: fakeChatModel,
    });

    expect(mockListEntities).toHaveBeenCalled();
    expect(mockPrepareLeadCandidates).not.toHaveBeenCalled();
    expect(mockSynthesizeLeads).not.toHaveBeenCalled();
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
      contentHash: 'hash-1',
    };
    mockPrepareLeadCandidates.mockResolvedValueOnce([candidate]);
    mockClassifyLeadCandidates.mockResolvedValueOnce([
      { candidate, decision: { type: 'refresh', existingId: 'existing-lead' } },
    ]);

    await runLeadGenerationPipeline({
      listEntities: mockListEntities,
      esClient,
      logger,
      spaceId: 'default',
      riskScoreDataClient,
      sourceType: 'adhoc',
      executionId: 'exec-123',
      chatModel: fakeChatModel,
    });

    expect(mockSynthesizeLeads).toHaveBeenCalledWith([], expect.any(Object));
    expect(mockPersistLeads).toHaveBeenCalledWith(
      expect.objectContaining({
        executionId: 'exec-123',
        sourceType: 'adhoc',
        refreshes: [{ existingId: 'existing-lead' }],
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
      contentHash: 'hash-create',
    };
    mockPrepareLeadCandidates.mockResolvedValueOnce([candidate]);
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
      listEntities: mockListEntities,
      esClient,
      logger,
      spaceId: 'default',
      riskScoreDataClient,
      sourceType: 'adhoc',
      executionId: 'exec-123',
      chatModel: fakeChatModel,
    });

    expect(mockRegisterModule).toHaveBeenCalledTimes(5);
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
      contentHash: 'hash-new',
    };
    mockPrepareLeadCandidates.mockResolvedValueOnce([candidate]);
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
      listEntities: mockListEntities,
      esClient,
      logger,
      spaceId: 'test-space',
      riskScoreDataClient,
      sourceType: 'scheduled',
      chatModel: fakeChatModel,
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
      contentHash: 'hash-d',
    };
    mockPrepareLeadCandidates.mockResolvedValueOnce([candidate]);
    mockClassifyLeadCandidates.mockResolvedValueOnce([{ candidate, decision: { type: 'skip' } }]);

    await runLeadGenerationPipeline({
      listEntities: mockListEntities,
      esClient,
      logger,
      spaceId: 'default',
      riskScoreDataClient,
      sourceType: 'adhoc',
      chatModel: fakeChatModel,
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

    mockPrepareLeadCandidates.mockResolvedValueOnce([
      createCandidate,
      skipCandidate,
      resurfaceCandidate,
    ]);
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
      listEntities: mockListEntities,
      esClient,
      logger,
      spaceId: 'default',
      riskScoreDataClient,
      sourceType: 'scheduled',
      chatModel: fakeChatModel,
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
});
