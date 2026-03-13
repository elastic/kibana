/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';

const mockFetchAllEntities = jest.fn();
jest.mock('./entity_retriever', () => ({
  createEntityRetriever: () => ({ fetchAllEntities: mockFetchAllEntities }),
}));

const mockGenerateLeads = jest.fn();
const mockRegisterModule = jest.fn();
jest.mock('./engine/lead_generation_engine', () => ({
  createLeadGenerationEngine: () => ({
    registerModule: mockRegisterModule,
    generateLeads: mockGenerateLeads,
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

const mockCreateLeads = jest.fn();
jest.mock('./lead_data_client', () => ({
  createLeadDataClient: () => ({ createLeads: mockCreateLeads }),
}));

import { runLeadGenerationPipeline } from './run_pipeline';

describe('runLeadGenerationPipeline', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns zero counts when no entities are found', async () => {
    mockFetchAllEntities.mockResolvedValueOnce([]);

    const result = await runLeadGenerationPipeline({
      esClient,
      logger,
      spaceId: 'default',
      sourceType: 'scheduled',
    });

    expect(result).toEqual({ total: 0 });
    expect(mockGenerateLeads).not.toHaveBeenCalled();
  });

  it('runs the full pipeline and returns counts', async () => {
    const mockEntity = { type: 'user', name: 'testuser' };
    mockFetchAllEntities.mockResolvedValueOnce([mockEntity]);

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
    mockGenerateLeads.mockResolvedValueOnce([mockLead]);

    const result = await runLeadGenerationPipeline({
      esClient,
      logger,
      spaceId: 'default',
      sourceType: 'adhoc',
      executionId: 'exec-123',
    });

    expect(result).toEqual({ total: 1 });
    expect(mockRegisterModule).toHaveBeenCalledTimes(3);
    expect(mockCreateLeads).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: 'adhoc',
        executionId: 'exec-123',
      })
    );
  });

  it('passes chatModel to engine when provided', async () => {
    const mockEntity = { type: 'host', name: 'server01' };
    mockFetchAllEntities.mockResolvedValueOnce([mockEntity]);
    mockGenerateLeads.mockResolvedValueOnce([]);

    const fakeChatModel = {} as never;

    await runLeadGenerationPipeline({
      esClient,
      logger,
      spaceId: 'default',
      sourceType: 'adhoc',
      chatModel: fakeChatModel,
    });

    expect(mockGenerateLeads).toHaveBeenCalledWith([mockEntity], { chatModel: fakeChatModel });
  });

  it('uses scheduled sourceType for Task Manager runs', async () => {
    const mockEntity = { type: 'user', name: 'admin' };
    mockFetchAllEntities.mockResolvedValueOnce([mockEntity]);
    mockGenerateLeads.mockResolvedValueOnce([]);

    await runLeadGenerationPipeline({
      esClient,
      logger,
      spaceId: 'test-space',
      sourceType: 'scheduled',
    });

    expect(mockCreateLeads).toHaveBeenCalledWith(
      expect.objectContaining({ sourceType: 'scheduled' })
    );
  });
});
