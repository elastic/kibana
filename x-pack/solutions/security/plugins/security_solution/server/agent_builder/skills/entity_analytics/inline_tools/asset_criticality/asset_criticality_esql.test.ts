/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { euid } from '@kbn/entity-store/common';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import { createToolHandlerContext, createToolTestMocks } from '../../../../__mocks__/test_helpers';
import { assetCriticalityDynamicInlineToolHandler } from './asset_criticality_esql';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { EntityAnalyticsSkillsContext } from '../../entity_analytics_skill';

jest.mock('../common', () => ({
  bootstrapCommonServices: jest.fn(),
  entityAnalyticsInlineToolSchema: {},
}));

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
}));

const mockBootstrapCommonServices = jest.requireMock('../common')
  .bootstrapCommonServices as jest.Mock;

const mockGenerateEsql = jest.requireMock('@kbn/agent-builder-genai-utils')
  .generateEsql as jest.Mock;

const defaultToolArgs = {
  entityType: 'host' as EntityType,
  prompt: 'What is the asset criticality?',
  queryExtraContext: '',
};

const ASSET_CRITICALITY_INDEX = '.asset-criticality.asset-criticality-default';

describe('assetCriticalityDynamicInlineToolHandler', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();

  const createContext = (overrides: { spaceId?: string } = {}) => {
    const baseContext = createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
      spaceId: overrides.spaceId ?? 'default',
    });
    return {
      ...baseContext,
      getStartServices: mockCore.getStartServices,
    } as unknown as ToolHandlerContext & EntityAnalyticsSkillsContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockBootstrapCommonServices.mockResolvedValue({
      defaultMessage: 'General security solution message.',
      isEntityStoreV2Enabled: false,
    });
  });

  it('should return generic security solution message when asset criticality index does not exist', async () => {
    mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(false);

    const result = await assetCriticalityDynamicInlineToolHandler(defaultToolArgs, createContext());

    expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
      index: ASSET_CRITICALITY_INDEX,
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

  it('should return asset criticality message with ESQL query when asset criticality index exists', async () => {
    const mockEsqlResults = { query: 'FROM .asset-criticality.asset-criticality-default' };
    mockEsClient.asInternalUser.indices.exists.mockResolvedValue(true);
    mockGenerateEsql.mockResolvedValue(mockEsqlResults);

    const result = await assetCriticalityDynamicInlineToolHandler(defaultToolArgs, createContext());

    expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
      index: ASSET_CRITICALITY_INDEX,
    });
    expect(mockGenerateEsql).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ASSET_CRITICALITY_INDEX,
        nlQuery: 'What is the asset criticality?',
      })
    );
    expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
      index: ASSET_CRITICALITY_INDEX,
    });
    expect(result.results).toHaveLength(3);

    const firstMessage = result.results[0];
    expect(firstMessage).toEqual({
      type: 'query',
      data: { esql: mockEsqlResults.query },
    });

    const secondMessage = result.results[1];
    expect(secondMessage.type).toBe(ToolResultType.other);
    expect((secondMessage.data as { message: string }).message).toMatchSnapshot();

    const thirdMessage = result.results[2];
    expect(thirdMessage.type).toBe(ToolResultType.other);
    expect((thirdMessage.data as { message: string }).message).toBe(
      'General security solution message.'
    );
  });

  it('should modify additional context when entity store v2 is enabled', async () => {
    const mockEsqlResults = { query: 'FROM .asset-criticality.asset-criticality-default' };
    mockEsClient.asInternalUser.indices.exists.mockResolvedValue(true);
    mockGenerateEsql.mockResolvedValue(mockEsqlResults);
    mockBootstrapCommonServices.mockResolvedValueOnce({
      defaultMessage: 'General security solution message.',
      isEntityStoreV2Enabled: true,
    });

    const result = await assetCriticalityDynamicInlineToolHandler(defaultToolArgs, createContext());

    expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
      index: ASSET_CRITICALITY_INDEX,
    });
    expect(mockGenerateEsql).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ASSET_CRITICALITY_INDEX,
        nlQuery: 'What is the asset criticality?',
        additionalContext: expect.stringContaining(
          `${euid.getEuidEsqlDocumentsContainsIdFilter('host')}`
        ),
      })
    );
    expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
      index: ASSET_CRITICALITY_INDEX,
    });
    expect(result.results).toHaveLength(3);

    const firstMessage = result.results[0];
    expect(firstMessage).toEqual({
      type: 'query',
      data: { esql: mockEsqlResults.query },
    });

    const secondMessage = result.results[1];
    expect(secondMessage.type).toBe(ToolResultType.other);
    expect((secondMessage.data as { message: string }).message).toMatchSnapshot();

    const thirdMessage = result.results[2];
    expect(thirdMessage.type).toBe(ToolResultType.other);
    expect((thirdMessage.data as { message: string }).message).toBe(
      'General security solution message.'
    );
  });

  it('should handle errors from the generateEsql function', async () => {
    const mockEsqlResults = { error: 'could not generate query' };
    mockEsClient.asInternalUser.indices.exists.mockResolvedValue(true);
    mockGenerateEsql.mockResolvedValue(mockEsqlResults);

    const result = await assetCriticalityDynamicInlineToolHandler(defaultToolArgs, createContext());

    expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
      index: ASSET_CRITICALITY_INDEX,
    });
    expect(mockGenerateEsql).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ASSET_CRITICALITY_INDEX,
        nlQuery: 'What is the asset criticality?',
      })
    );
    expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
      index: ASSET_CRITICALITY_INDEX,
    });
    expect(result.results).toHaveLength(1);

    const firstMessage = result.results[0];
    expect(firstMessage).toEqual({
      type: 'error',
      data: { message: mockEsqlResults.error },
    });
  });

  it('should return error result when error throws', async () => {
    mockEsClient.asInternalUser.indices.exists.mockRejectedValue(new Error('ES connection failed'));

    const result = await assetCriticalityDynamicInlineToolHandler(defaultToolArgs, createContext());

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { error: string }).error).toContain(
      'Error retrieving entity analytics data'
    );
    expect((result.results[0].data as { error: string }).error).toContain('ES connection failed');
  });
});
