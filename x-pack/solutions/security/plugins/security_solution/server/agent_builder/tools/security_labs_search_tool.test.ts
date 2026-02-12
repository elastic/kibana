/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult } from '@kbn/agent-builder-common';
import type {
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import { coreMock } from '@kbn/core/server/mocks';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
} from '../__mocks__/test_helpers';
import { securityLabsSearchTool } from './security_labs_search_tool';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../plugin_contract';

const retrieveDocumentation = jest.fn();
const retrieveDocumentationAvailable = jest.fn();

describe('securityLabsSearchTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const mockModelProvider = {
    getDefaultModel: jest.fn().mockResolvedValue({
      model: 'test-model',
      connector: { connectorId: 'fake-connector' },
    }),
    getModel: jest.fn(),
    getUsageStats: jest.fn().mockReturnValue({ calls: [] }),
  };
  const mockEvents = {
    reportProgress: jest.fn(),
    sendUiEvent: jest.fn(),
  };
  const tool = securityLabsSearchTool(mockCore);

  beforeEach(() => {
    jest.clearAllMocks();
    const coreStart = coreMock.createStart();
    Object.assign(coreStart.elasticsearch.client, {
      asInternalUser: mockEsClient.asInternalUser,
      asCurrentUser: mockEsClient.asCurrentUser,
    });

    const llmTasks = {
      retrieveDocumentation,
      retrieveDocumentationAvailable,
    } as unknown as LlmTasksPluginStart;

    const pluginsStart = {
      llmTasks,
    } as unknown as SecuritySolutionPluginStartDependencies;

    mockCore.getStartServices.mockResolvedValue([
      coreStart,
      pluginsStart,
      {} as unknown as SecuritySolutionPluginStart,
    ]);
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
      retrieveDocumentationAvailable.mockResolvedValue(true);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('available');
    });
  });

  describe('handler', () => {
    it('enhances query with Security Labs filter', async () => {
      retrieveDocumentationAvailable.mockResolvedValue(true);
      retrieveDocumentation.mockResolvedValue({
        success: true,
        documents: [],
      });

      await tool.handler(
        { query: 'test query' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents,
        })
      );

      expect(retrieveDocumentation).toHaveBeenCalled();
    });

    it('calls retrieveDocumentation with correct parameters', async () => {
      retrieveDocumentationAvailable.mockResolvedValue(true);
      const mockDocs = [
        {
          title: 'doc-title',
          url: 'https://www.elastic.co/security-labs/some-slug',
          content: 'doc-content',
          summarized: false,
        },
      ];
      retrieveDocumentation.mockResolvedValue({ success: true, documents: mockDocs });

      await tool.handler(
        { query: 'malware analysis' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents,
        })
      );

      expect(retrieveDocumentation).toHaveBeenCalledWith(
        expect.objectContaining({
          searchTerm: 'malware analysis',
          max: 3,
          connectorId: 'fake-connector',
        })
      );
    });

    it('handles errors', async () => {
      const error = new Error('Search tool error');
      retrieveDocumentationAvailable.mockResolvedValue(true);
      retrieveDocumentation.mockRejectedValue(error);

      const result = (await tool.handler(
        { query: 'test query' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as ToolHandlerContext['modelProvider'],
          events: mockEvents as ToolHandlerContext['events'],
        })
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Error: Search tool error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
