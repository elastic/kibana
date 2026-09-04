/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { isToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { runSearchTool } from '@kbn/agent-builder-genai-utils/tools';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { DEFAULT_ALERTS_INDEX, ESSENTIAL_ALERT_FIELDS } from '../../../common/constants';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import { alertsTool, SECURITY_ALERTS_TOOL_ID } from './alerts_tool';

jest.mock('@kbn/agent-builder-genai-utils/tools', () => ({
  runSearchTool: jest.fn(),
}));

describe('alertsTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const mockModelProvider = agentBuilderMocks.createModelProvider();
  mockModelProvider.getDefaultModel.mockResolvedValue({ model: 'test-model' } as never);
  const mockEvents = {
    reportProgress: jest.fn(),
    sendUiEvent: jest.fn(),
  };
  const tool = alertsTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
    // Existing handler tests assume the space alerts alias is present.
    mockEsClient.asInternalUser.indices.exists.mockResolvedValue(true);
  });

  describe('schema', () => {
    it('validates correct schema with required query', () => {
      const result = tool.schema.safeParse({
        query: 'find all alerts',
      });

      expect(result.success).toBe(true);
    });

    it('strips a provided index field (parameter removed for space isolation)', () => {
      const result = tool.schema.safeParse({
        query: 'find alerts',
        index: '.alerts-security.alerts-*',
      });

      // Zod strips unknown keys by default; the handler never reads `index`.
      expect(result.success && !('index' in result.data)).toBe(true);
    });

    it('validates schema with optional isCount', () => {
      const result = tool.schema.safeParse({
        query: 'how many alerts',
        isCount: true,
      });

      expect(result.success).toBe(true);
    });

    it('rejects missing query', () => {
      const result = tool.schema.safeParse({});

      expect(result.success).toBe(false);
    });

    it('rejects non-string query', () => {
      const result = tool.schema.safeParse({
        query: 123,
      });

      expect(result.success).toBe(false);
    });

    it('rejects query longer than 4000 characters', () => {
      const result = tool.schema.safeParse({
        query: 'a'.repeat(4001),
      });

      expect(result.success).toBe(false);
    });

    it('rejects non-boolean isCount', () => {
      const result = tool.schema.safeParse({
        query: 'test',
        isCount: 'yes',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('tool properties', () => {
    it('returns correct tool id', () => {
      expect(tool.id).toBe(SECURITY_ALERTS_TOOL_ID);
    });

    it('has correct tags', () => {
      expect(tool.tags).toEqual(['security', 'alerts']);
    });

    it('describes space-scoped search behavior', () => {
      expect(tool.description).toContain("current space's exact alerts alias");
      expect(tool.description).toMatch(/^Do NOT use platform\.core\.generate_esql/);
      expect(tool.description).toContain('execute_esql');
    });
  });

  describe('handler', () => {
    it('returns 0 alerts without searching when the space alerts alias does not exist', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValue(false);

      const result = await tool.handler(
        { query: 'how many alerts', isCount: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
          spaceId: 'testing',
        })
      );

      expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
        index: `${DEFAULT_ALERTS_INDEX}-testing`,
      });
      expect(runSearchTool).not.toHaveBeenCalled();
      expect(isToolHandlerStandardReturn(result)).toBe(true);
      expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
      expect((result as ToolHandlerStandardReturn).results[0]).toMatchObject({
        type: ToolResultType.other,
        data: {
          count: 0,
          spaceId: 'testing',
          index: `${DEFAULT_ALERTS_INDEX}-testing`,
          message: expect.stringContaining('There are 0 security alerts'),
        },
      });
    });

    it('calls runSearchTool with the current space alerts alias', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      (runSearchTool as jest.Mock).mockResolvedValue({ results: mockResults });

      await tool.handler(
        { query: 'find all alerts' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
        index: `${DEFAULT_ALERTS_INDEX}-default`,
      });
      expect(runSearchTool).toHaveBeenCalledWith({
        nlQuery: expect.stringContaining('find all alerts'),
        index: `${DEFAULT_ALERTS_INDEX}-default`,
        esClient: mockEsClient.asCurrentUser,
        modelProvider: mockModelProvider,
        events: mockEvents,
        logger: mockLogger,
      });
    });

    it('enhances the query with a KEEP clause for essential alert fields', async () => {
      (runSearchTool as jest.Mock).mockResolvedValue({ results: [] });
      const fieldsList = ESSENTIAL_ALERT_FIELDS.map((field) => `\`${field}\``).join(', ');

      await tool.handler(
        { query: 'find all alerts' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.nlQuery).toContain(fieldsList);
    });

    it('uses handler context spaceId when building the alerts alias', async () => {
      (runSearchTool as jest.Mock).mockResolvedValue({ results: [] });

      await tool.handler(
        { query: 'find all alerts' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
          spaceId: 'custom-space',
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.index).toBe(`${DEFAULT_ALERTS_INDEX}-custom-space`);
    });

    it('forwards time_window_hours to runSearchTool as a time range', async () => {
      (runSearchTool as jest.Mock).mockResolvedValue({ results: [] });

      await tool.handler(
        { query: 'find alerts', time_window_hours: 72 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.timeRange).toEqual({ from: 'now-72h', to: 'now' });
    });

    it('leaves the time range unset when time_window_hours is not provided (24h default preserved)', async () => {
      (runSearchTool as jest.Mock).mockResolvedValue({ results: [] });

      await tool.handler(
        { query: 'find alerts' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.timeRange).toBeUndefined();
    });

    it('ignores a caller-supplied index and still uses the space alias', async () => {
      (runSearchTool as jest.Mock).mockResolvedValue({ results: [] });

      await tool.handler(
        // Simulate a stale model/tool call that still sends index; schema strips it,
        // and the handler never reads it.
        { query: 'find alerts', index: '.alerts-security.alerts-*' } as { query: string },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
          spaceId: 'qa',
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.index).toBe(`${DEFAULT_ALERTS_INDEX}-qa`);
    });

    it('enhances query with count instructions when isCount is true', async () => {
      (runSearchTool as jest.Mock).mockResolvedValue({ results: [] });

      await tool.handler(
        { query: 'how many alerts', isCount: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.nlQuery).toContain('STATS count = COUNT(*)');
    });

    it('logs debug message with correct parameters', async () => {
      (runSearchTool as jest.Mock).mockResolvedValue({ results: [] });

      await tool.handler(
        { query: 'test query', isCount: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `alerts tool called with query: test query, index: ${DEFAULT_ALERTS_INDEX}-default, isCount: true, timeWindowHours: default`
      );
    });

    it('returns results from runSearchTool', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      const runSearchToolResult = { results: mockResults };
      (runSearchTool as jest.Mock).mockResolvedValue(runSearchToolResult);

      const result = await tool.handler(
        { query: 'find alerts' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      expect(result).toEqual({ results: runSearchToolResult });
    });
  });
});
