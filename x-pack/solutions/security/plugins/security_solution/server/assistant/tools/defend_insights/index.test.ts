/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicTool } from '@langchain/core/tools';

import { requestHasRequiredAnonymizationParams } from '@kbn/elastic-assistant-plugin/server/lib/langchain/helpers';
import { DEFEND_INSIGHTS_TOOL_ID, DefendInsightType } from '@kbn/elastic-assistant-common';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import type { DefendInsightsToolParams } from '.';

import { APP_UI_ID } from '../../../../common';
import { DEFEND_INSIGHTS_TOOL, DEFEND_INSIGHTS_TOOL_DESCRIPTION } from '.';

jest.mock('@kbn/elastic-assistant-plugin/server/lib/langchain/helpers', () => ({
  requestHasRequiredAnonymizationParams: jest.fn(),
}));

describe('DEFEND_INSIGHTS_TOOL', () => {
  const mockLLM = {};
  const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
  const mockRequest = {};
  const mockParams: DefendInsightsToolParams = {
    endpointIds: ['endpoint1'],
    insightType: DefendInsightType.Enum.incompatible_antivirus,
    anonymizationFields: [],
    esClient: mockEsClient,
    langChainTimeout: 1000,
    llm: mockLLM,
    onNewReplacements: jest.fn(),
    replacements: {},
    request: mockRequest,
  } as unknown as DefendInsightsToolParams;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should have correct properties', () => {
    expect(DEFEND_INSIGHTS_TOOL.id).toBe(DEFEND_INSIGHTS_TOOL_ID);
    expect(DEFEND_INSIGHTS_TOOL.name).toBe('defendInsightsTool');
    expect(DEFEND_INSIGHTS_TOOL.description).toBe(DEFEND_INSIGHTS_TOOL_DESCRIPTION);
    expect(DEFEND_INSIGHTS_TOOL.sourceRegister).toBe(APP_UI_ID);
  });

  it('should return tool if supported', () => {
    (requestHasRequiredAnonymizationParams as jest.Mock).mockReturnValue(true);
    const tool = DEFEND_INSIGHTS_TOOL.getTool(mockParams);
    expect(tool).toBeInstanceOf(DynamicTool);
  });

  it('should return null if not request missing anonymization params', () => {
    (requestHasRequiredAnonymizationParams as jest.Mock).mockReturnValue(false);
    const tool = DEFEND_INSIGHTS_TOOL.getTool(mockParams);
    expect(tool).toBeNull();
  });

  it('should return null if LLM is not provided', () => {
    (requestHasRequiredAnonymizationParams as jest.Mock).mockReturnValue(true);
    const paramsWithoutLLM = { ...mockParams, llm: undefined };
    const tool = DEFEND_INSIGHTS_TOOL.getTool(paramsWithoutLLM) as DynamicTool;

    expect(tool).toBeNull();
  });
});
