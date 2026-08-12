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
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import { ResourceTypes } from '@kbn/product-doc-common';
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
  const mockModelProvider = agentBuilderMocks.createModelProvider();
  mockModelProvider.getDefaultModel.mockResolvedValue({
    model: 'test-model',
    connector: { connectorId: 'fake-connector' },
  } as never);
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
    it('calls retrieveDocumentation with Security Labs resource type and inference id', async () => {
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
          resourceTypes: [ResourceTypes.securityLabs],
        })
      );
    });

    it('returns an error result when retrieval fails', async () => {
      retrieveDocumentationAvailable.mockResolvedValue(true);
      retrieveDocumentation.mockResolvedValue({
        success: false,
        documents: [],
      });

      const result = (await tool.handler(
        { query: 'test query' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      )) as ToolHandlerStandardReturn;

      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Failed to retrieve Security Labs');
    });

    it('returns empty results when retrieval succeeds with no documents', async () => {
      retrieveDocumentationAvailable.mockResolvedValue(true);
      retrieveDocumentation.mockResolvedValue({
        success: true,
        documents: [],
      });

      const result = (await tool.handler(
        { query: 'test query' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      )) as ToolHandlerStandardReturn;

      expect(result.results).toEqual([]);
    });

    it('prefers Jina when its endpoint exists and Jina Security Labs docs are installed', async () => {
      (mockEsClient.asInternalUser.inference.get as unknown as jest.Mock).mockResolvedValue({
        endpoints: [
          { inference_id: defaultInferenceEndpoints.ELSER },
          { inference_id: defaultInferenceEndpoints.JINAv5 },
        ],
      });
      retrieveDocumentationAvailable.mockImplementation(
        async ({ inferenceId }: { inferenceId: string }) =>
          inferenceId === defaultInferenceEndpoints.JINAv5
      );
      retrieveDocumentation.mockResolvedValue({ success: true, documents: [] });

      await tool.handler(
        { query: 'malware analysis' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents,
        })
      );

      expect(retrieveDocumentation).toHaveBeenCalledWith(
        expect.objectContaining({ inferenceId: defaultInferenceEndpoints.JINAv5 })
      );
    });

    it('falls back to ELSER when no Jina endpoint is available (on-prem)', async () => {
      (mockEsClient.asInternalUser.inference.get as unknown as jest.Mock).mockResolvedValue({
        endpoints: [{ inference_id: defaultInferenceEndpoints.ELSER }],
      });
      retrieveDocumentationAvailable.mockImplementation(
        async ({ inferenceId }: { inferenceId: string }) =>
          inferenceId === defaultInferenceEndpoints.ELSER
      );
      retrieveDocumentation.mockResolvedValue({ success: true, documents: [] });

      await tool.handler(
        { query: 'malware analysis' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents,
        })
      );

      expect(retrieveDocumentation).toHaveBeenCalledWith(
        expect.objectContaining({ inferenceId: defaultInferenceEndpoints.ELSER })
      );
    });

    it('returns install guidance when no candidate model has Security Labs installed', async () => {
      (mockEsClient.asInternalUser.inference.get as unknown as jest.Mock).mockResolvedValue({
        endpoints: [{ inference_id: defaultInferenceEndpoints.JINAv5 }],
      });
      retrieveDocumentationAvailable.mockResolvedValue(false);

      const result = (await tool.handler(
        { query: 'test query' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      )) as ToolHandlerStandardReturn;

      expect(retrieveDocumentation).not.toHaveBeenCalled();
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('not installed');
      // Must include server.basePath so Agent Builder treats the link as internal.
      expect(errorResult.data.metadata).toEqual({
        settingsUrl: '/mock-server-basepath/app/management/ai/genAiSettings',
      });
      expect(errorResult.data.message).toContain(
        '[GenAI Settings](/mock-server-basepath/app/management/ai/genAiSettings)'
      );
    });

    it('includes the current space in the GenAI Settings install URL', async () => {
      (mockEsClient.asInternalUser.inference.get as unknown as jest.Mock).mockResolvedValue({
        endpoints: [{ inference_id: defaultInferenceEndpoints.JINAv5 }],
      });
      retrieveDocumentationAvailable.mockResolvedValue(false);

      const result = (await tool.handler(
        { query: 'test query' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
          spaceId: 'security',
        })
      )) as ToolHandlerStandardReturn;

      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.data.metadata).toEqual({
        settingsUrl: '/mock-server-basepath/s/security/app/management/ai/genAiSettings',
      });
    });

    it('handles errors', async () => {
      const error = new Error('Search tool error');
      retrieveDocumentationAvailable.mockResolvedValue(true);
      retrieveDocumentation.mockRejectedValue(error);

      const result = (await tool.handler(
        { query: 'test query' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
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
