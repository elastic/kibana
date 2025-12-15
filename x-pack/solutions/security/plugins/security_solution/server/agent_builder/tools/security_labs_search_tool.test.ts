/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult } from '@kbn/onechat-common';
import type { ToolHandlerContext } from '@kbn/onechat-server/tools';
import { SECURITY_LABS_RESOURCE } from '@kbn/elastic-assistant-plugin/server/routes/knowledge_base/constants';
import { runSearchTool } from '@kbn/onechat-genai-utils/tools/search/run_search_tool';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import { securityLabsSearchTool } from './security_labs_search_tool';

jest.mock('@kbn/onechat-genai-utils/tools/search/run_search_tool', () => ({
  runSearchTool: jest.fn(),
}));

describe('securityLabsSearchTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const mockModelProvider = {
    getDefaultModel: jest.fn().mockResolvedValue({ model: 'test-model' }),
    getModel: jest.fn(),
    getUsageStats: jest.fn().mockReturnValue({ calls: [] }),
  };
  const mockEvents = {
    reportProgress: jest.fn(),
  };
  const tool = securityLabsSearchTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
  });

  describe('schema', () => {
    it('validates correct schema', () => {
      const validInput = {
        query: 'test query',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('rejects missing query', () => {
      const invalidInput = {};

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects non-string query', () => {
      const invalidInput = {
        query: 123,
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });
  });

  describe('availability', () => {
    it('returns available when Security Labs content exists', async () => {
      mockEsClient.asInternalUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [
            {
              _id: 'test-id',
              _index: 'test-index',
              _source: { kb_resource: SECURITY_LABS_RESOURCE },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      });

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('available');
      expect(mockEsClient.asInternalUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.kibana-elastic-ai-assistant-knowledge-base-default',
          query: expect.objectContaining({
            bool: {
              filter: [
                {
                  term: {
                    kb_resource: SECURITY_LABS_RESOURCE,
                  },
                },
              ],
            },
          }),
        })
      );
    });

    it('returns unavailable when Security Labs content not found', async () => {
      mockEsClient.asInternalUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      });

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toBe('Security Labs content not found in knowledge base');
    });

    it('returns unavailable when availability check throws error', async () => {
      mockEsClient.asInternalUser.search.mockRejectedValue(new Error('ES error'));

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toContain('Failed to check Security Labs knowledge base availability');
    });
  });

  describe('handler', () => {
    it('enhances query with Security Labs filter', async () => {
      const mockResults = [
        {
          type: ToolResultType.resource,
          data: {
            reference: { id: 'test-id', index: 'test-index' },
            content: { content: 'test result' },
          },
        },
      ];
      (runSearchTool as jest.Mock).mockResolvedValue({ results: mockResults });

      await tool.handler(
        { query: 'test query' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents,
        })
      );

      expect(runSearchTool).toHaveBeenCalled();
      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.nlQuery).toContain('test query');
      expect(callArgs.nlQuery).toContain(`kb_resource: ${SECURITY_LABS_RESOURCE}`);
      expect(callArgs.nlQuery).toContain('Limit to 3 results');
    });

    it('calls runSearchTool with correct parameters', async () => {
      const mockResults = [
        {
          type: ToolResultType.resource,
          data: {
            reference: { id: 'test-id', index: 'test-index' },
            content: { content: 'test result' },
          },
        },
      ];
      (runSearchTool as jest.Mock).mockResolvedValue({ results: mockResults });

      await tool.handler(
        { query: 'malware analysis' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as ToolHandlerContext['modelProvider'],
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      expect(runSearchTool).toHaveBeenCalledWith({
        nlQuery: expect.stringContaining('malware analysis'),
        index: '.kibana-elastic-ai-assistant-knowledge-base-default',
        model: { model: 'test-model' },
        esClient: mockEsClient.asCurrentUser,
        logger: mockLogger,
        events: mockEvents,
      });
    });

    it('handles errors', async () => {
      const error = new Error('Search tool error');
      (runSearchTool as jest.Mock).mockRejectedValue(error);

      const result = await tool.handler(
        { query: 'test query' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as ToolHandlerContext['modelProvider'],
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Error: Search tool error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
