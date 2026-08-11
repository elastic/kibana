/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { InferenceChatModel } from '@kbn/inference-langchain';

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
import { computeEntityIdentityKey } from './content_hash';
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
    mockPersistLeads.mockResolvedValue(undefined);
  });

  it('returns zero counts when no entities are found', async () => {
    mockListEntities.mockResolvedValueOnce([]);

    const result = await runLeadGenerationPipeline({
      listEntities: mockListEntities,
      esClient,
      logger,
      spaceId: 'default',
      riskScoreDataClient,
      sourceType: 'scheduled',
      chatModel: fakeChatModel,
    });

    expect(result).toEqual({ total: 0 });
    expect(mockListEntities).toHaveBeenCalled();
    expect(mockPrepareLeadCandidates).not.toHaveBeenCalled();
    expect(mockSynthesizeLeads).not.toHaveBeenCalled();
  });

  it('skips LLM for deduped candidates and only refreshes timestamps', async () => {
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
      entityIdentityKey: 'entity-key-1',
      contentHash: 'hash-1',
    };
    mockPrepareLeadCandidates.mockResolvedValueOnce([candidate]);
    mockClassifyLeadCandidates.mockResolvedValueOnce([
      { candidate, decision: { type: 'dedup', existingId: 'existing-lead' } },
    ]);

    const result = await runLeadGenerationPipeline({
      listEntities: mockListEntities,
      esClient,
      logger,
      spaceId: 'default',
      riskScoreDataClient,
      sourceType: 'adhoc',
      executionId: 'exec-123',
      chatModel: fakeChatModel,
    });

    expect(result).toEqual({ total: 1 });
    expect(mockSynthesizeLeads).toHaveBeenCalledWith([], expect.any(Object));
    expect(mockPersistLeads).toHaveBeenCalledWith(
      expect.objectContaining({
        executionId: 'exec-123',
        sourceType: 'adhoc',
        dedups: [{ existingId: 'existing-lead' }],
        creates: [],
        versions: [],
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
      entityIdentityKey: computeEntityIdentityKey({ entities: [mockEntity] }),
      contentHash: 'hash-create',
    };
    mockPrepareLeadCandidates.mockResolvedValueOnce([candidate]);
    mockClassifyLeadCandidates.mockResolvedValueOnce([{ candidate, decision: { type: 'create' } }]);

    const mockLead = {
      id: 'lead-1',
      title: 'Test Lead',
      byline: '',
      description: '',
      entities: [mockEntity],
      tags: [],
      priority: 5,
      chatRecommendations: [],
      timestamp: '2026-03-10T00:00:00.000Z',
      staleness: 'fresh',
      observations: [],
    };
    mockSynthesizeLeads.mockResolvedValueOnce([mockLead]);

    const result = await runLeadGenerationPipeline({
      listEntities: mockListEntities,
      esClient,
      logger,
      spaceId: 'default',
      riskScoreDataClient,
      sourceType: 'adhoc',
      executionId: 'exec-123',
      chatModel: fakeChatModel,
    });

    expect(result).toEqual({ total: 1 });
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
            status: 'active',
          }),
        ],
        versions: [],
        dedups: [],
      })
    );
    expect(mockPersistLeads.mock.calls[0][0].creates[0]).not.toHaveProperty('contentHash');
    expect(mockPersistLeads.mock.calls[0][0].creates[0]).not.toHaveProperty('entityIdentityKey');
  });

  it('synthesizes and versions when content hash changed', async () => {
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
      entityIdentityKey: computeEntityIdentityKey({ entities: [mockEntity] }),
      contentHash: 'hash-new',
    };
    mockPrepareLeadCandidates.mockResolvedValueOnce([candidate]);
    mockClassifyLeadCandidates.mockResolvedValueOnce([
      { candidate, decision: { type: 'version', existingId: 'existing-admin' } },
    ]);
    mockSynthesizeLeads.mockResolvedValueOnce([
      {
        id: 'lead-new',
        title: 'Updated',
        byline: '',
        description: '',
        entities: [mockEntity],
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
        versions: [
          expect.objectContaining({
            existingId: 'existing-admin',
            lead: expect.objectContaining({ id: 'lead-new' }),
          }),
        ],
        creates: [],
        dedups: [],
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
      entityIdentityKey: 'entity-key-d',
      contentHash: 'hash-d',
    };
    mockPrepareLeadCandidates.mockResolvedValueOnce([candidate]);
    mockClassifyLeadCandidates.mockResolvedValueOnce([{ candidate, decision: { type: 'skip' } }]);

    const result = await runLeadGenerationPipeline({
      listEntities: mockListEntities,
      esClient,
      logger,
      spaceId: 'default',
      riskScoreDataClient,
      sourceType: 'adhoc',
      chatModel: fakeChatModel,
    });

    expect(result).toEqual({ total: 0 });
    expect(mockSynthesizeLeads).toHaveBeenCalledWith([], expect.any(Object));
    expect(mockPersistLeads).toHaveBeenCalledWith(
      expect.objectContaining({
        dedups: [],
        creates: [],
        versions: [],
      })
    );
  });
});
