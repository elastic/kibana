/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import { createToolHandlerContext, createToolTestMocks } from '../../../__mocks__/test_helpers';
import { riskScoreInlineToolHandler } from './risk_score';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { EntityAnalysisSkillsContext } from '../entity_analysis_skill';

jest.mock('./common', () => ({
  bootstrapCommonServices: jest.fn(),
  entityAnalyticsInlineToolSchema: {},
}));

const mockBootstrapCommonServices = jest.requireMock('./common')
  .bootstrapCommonServices as jest.Mock;

const defaultToolArgs = {
  entityType: 'host' as EntityType,
  prompt: 'What is the risk score?',
  queryExtraContext: '',
};

const RISK_SCORE_LATEST_INDEX = 'risk-score.risk-score-latest-default';

describe('riskScoreInlineToolHandler', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();

  const createContext = (overrides: { spaceId?: string } = {}) => {
    const baseContext = createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
      spaceId: overrides.spaceId ?? 'default',
    });
    return {
      ...baseContext,
      getStartServices: mockCore.getStartServices,
      toolProvider: { has: jest.fn(), get: jest.fn() },
    } as unknown as ToolHandlerContext & EntityAnalysisSkillsContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockBootstrapCommonServices.mockResolvedValue({
      defaultMessage: 'General security solution message.',
      generateESQLTool: null,
      isEntityStoreV2Enabled: false,
    });
  });

  it('should return generic security solution message when risk score index does not exist', async () => {
    mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(false);

    const result = await riskScoreInlineToolHandler(defaultToolArgs, createContext());

    expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
      index: RISK_SCORE_LATEST_INDEX,
    });
    expect(result.results).toHaveLength(2);

    const firstMessage = result.results[0];
    expect(firstMessage.type).toBe(ToolResultType.other);
    expect((firstMessage.data as { message: string }).message).toMatchSnapshot();

    const secondMessage = result.results[1];
    expect(secondMessage.type).toBe(ToolResultType.other);
    expect((secondMessage.data as { message: string }).message).toBe(
      'General security solution message.'
    );
  });

  it('should return risk score message when risk score index exists but generate ESQL tool is null', async () => {
    mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(true);
    mockBootstrapCommonServices.mockResolvedValue({
      defaultMessage: 'General security solution message.',
      generateESQLTool: null,
      isEntityStoreV2Enabled: false,
    });

    const result = await riskScoreInlineToolHandler(defaultToolArgs, createContext());

    expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
      index: RISK_SCORE_LATEST_INDEX,
    });
    expect(result.results).toHaveLength(2);

    const firstMessage = result.results[0];
    expect(firstMessage.type).toBe(ToolResultType.other);
    expect((firstMessage.data as { message: string }).message).toMatchSnapshot();

    const secondMessage = result.results[1];
    expect(secondMessage.type).toBe(ToolResultType.other);
    expect((secondMessage.data as { message: string }).message).toBe(
      'General security solution message.'
    );
  });

  it('should return risk score message with EUID filter when risk score index exists but generate ESQL tool is null and isEntityStoreV2Enabled: true', async () => {
    mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(true);
    mockBootstrapCommonServices.mockResolvedValue({
      defaultMessage: 'General security solution message.',
      generateESQLTool: null,
      isEntityStoreV2Enabled: true,
    });

    const result = await riskScoreInlineToolHandler(defaultToolArgs, createContext());

    expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
      index: RISK_SCORE_LATEST_INDEX,
    });
    expect(result.results).toHaveLength(2);

    const firstMessage = result.results[0];
    expect(firstMessage.type).toBe(ToolResultType.other);
    expect((firstMessage.data as { message: string }).message).toMatchSnapshot();

    const secondMessage = result.results[1];
    expect(secondMessage.type).toBe(ToolResultType.other);
    expect((secondMessage.data as { message: string }).message).toBe(
      'General security solution message.'
    );
  });

  it('should return risk score message with ESQL query when risk score index exists and generate ESQL tool is available', async () => {
    const mockEsqlResults = [
      { type: ToolResultType.query, data: { query: 'FROM risk-score.risk-score-latest-default' } },
    ];
    const mockExecute = jest.fn().mockResolvedValue({ results: mockEsqlResults });
    mockEsClient.asInternalUser.indices.exists.mockResolvedValue(true);
    mockBootstrapCommonServices.mockResolvedValue({
      defaultMessage: 'General security solution message.',
      generateESQLTool: { execute: mockExecute },
      isEntityStoreV2Enabled: false,
    });

    const result = await riskScoreInlineToolHandler(defaultToolArgs, createContext());

    expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
      index: RISK_SCORE_LATEST_INDEX,
    });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        toolParams: expect.objectContaining({
          index: RISK_SCORE_LATEST_INDEX,
          query: 'What is the risk score?',
        }),
      })
    );
    expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
      index: RISK_SCORE_LATEST_INDEX,
    });
    expect(result.results).toHaveLength(3);

    const firstMessage = result.results[0];
    expect(firstMessage).toEqual(mockEsqlResults[0]);

    const secondMessage = result.results[1];
    expect(secondMessage.type).toBe(ToolResultType.other);
    expect((secondMessage.data as { message: string }).message).toMatchSnapshot();

    const thirdMessage = result.results[2];
    expect(thirdMessage.type).toBe(ToolResultType.other);
    expect((thirdMessage.data as { message: string }).message).toBe(
      'General security solution message.'
    );
  });

  it('should return error result when error throws', async () => {
    mockEsClient.asInternalUser.indices.exists.mockRejectedValue(new Error('ES connection failed'));

    const result = await riskScoreInlineToolHandler(defaultToolArgs, createContext());

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect((result.results[0].data as { error: string }).error).toContain(
      'Error retrieving entity analytics data'
    );
    expect((result.results[0].data as { error: string }).error).toContain('ES connection failed');
  });
});
