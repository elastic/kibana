/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/onechat-common';
import type { ToolHandlerContext } from '@kbn/onechat-server/tools';
import { runSearchTool } from '@kbn/onechat-genai-utils/tools';
import { DEFAULT_ALERTS_INDEX, ESSENTIAL_ALERT_FIELDS } from '../../../common/constants';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import { alertsTool, SECURITY_ALERTS_TOOL_ID } from './alerts_tool';

jest.mock('@kbn/onechat-genai-utils/tools', () => ({
  runSearchTool: jest.fn(),
}));

describe('alertsTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const mockModelProvider = {
    getDefaultModel: jest.fn().mockResolvedValue({ model: 'test-model' }),
    getModel: jest.fn(),
    getUsageStats: jest.fn().mockReturnValue({ calls: [] }),
  };
  const mockEvents = {
    reportProgress: jest.fn(),
  };
  const tool = alertsTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
  });

  describe('schema', () => {
    it('validates correct schema with required query', () => {
      const validInput = {
        query: 'find all alerts',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates schema with optional index', () => {
      const validInput = {
        query: 'find alerts',
        index: '.alerts-security.alerts-default',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates schema with optional isCount', () => {
      const validInput = {
        query: 'how many alerts',
        isCount: true,
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

    it('rejects non-boolean isCount', () => {
      const invalidInput = {
        query: 'test',
        isCount: 'yes',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('validates workflow status update schema (set_workflow_status)', () => {
      const validInput = {
        operation: 'set_workflow_status',
        alertIds: ['abc'],
        status: 'acknowledged',
        confirm: true,
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates workflow status update schema (acknowledge)', () => {
      const validInput = {
        operation: 'acknowledge',
        alertIds: ['abc'],
        confirm: true,
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });
  });

  describe('tool properties', () => {
    it('returns correct tool id', () => {
      expect(tool.id).toBe(SECURITY_ALERTS_TOOL_ID);
    });

    it('has correct tags', () => {
      expect(tool.tags).toEqual(['security', 'alerts']);
    });
  });

  describe('handler', () => {
    it('calls runSearchTool with default index when index not provided', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      (runSearchTool as jest.Mock).mockResolvedValue({ results: mockResults });
      const fieldsList = ESSENTIAL_ALERT_FIELDS.map((field) => `\`${field}\``).join(', ');

      await tool.handler(
        { query: 'find all alerts' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as ToolHandlerContext['modelProvider'],
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      expect(runSearchTool).toHaveBeenCalledWith({
        nlQuery: expect.stringContaining('find all alerts'),
        index: `${DEFAULT_ALERTS_INDEX}-default`,
        esClient: mockEsClient.asCurrentUser,
        model: { model: 'test-model' },
        events: mockEvents,
        logger: mockLogger,
      });
      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.nlQuery).toContain('KEEP clause');
      expect(callArgs.nlQuery).toContain(fieldsList);
    });

    it('calls runSearchTool with explicit index when provided', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      (runSearchTool as jest.Mock).mockResolvedValue({ results: mockResults });

      await tool.handler(
        { query: 'find alerts', index: '.alerts-security.alerts-custom' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as ToolHandlerContext['modelProvider'],
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      expect(runSearchTool).toHaveBeenCalledWith({
        nlQuery: expect.stringContaining('find alerts'),
        index: '.alerts-security.alerts-custom',
        esClient: mockEsClient.asCurrentUser,
        model: { model: 'test-model' },
        events: mockEvents,
        logger: mockLogger,
      });
    });

    it('enhances query with KEEP clause for alerts index', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      (runSearchTool as jest.Mock).mockResolvedValue({ results: mockResults });
      const fieldsList = ESSENTIAL_ALERT_FIELDS.map((field) => `\`${field}\``).join(', ');

      await tool.handler(
        { query: 'find alerts', index: '.alerts-security.alerts-default' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as ToolHandlerContext['modelProvider'],
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.nlQuery).toContain('find alerts');
      expect(callArgs.nlQuery).toContain('KEEP clause');
      expect(callArgs.nlQuery).toContain(fieldsList);
    });

    it('enhances query with count instructions when isCount is true', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      (runSearchTool as jest.Mock).mockResolvedValue({ results: mockResults });

      await tool.handler(
        { query: 'how many alerts', index: '.alerts-security.alerts-default', isCount: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as ToolHandlerContext['modelProvider'],
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.nlQuery).toContain('how many alerts');
      expect(callArgs.nlQuery).toContain('count query');
      expect(callArgs.nlQuery).toContain('STATS count = COUNT(*)');
    });

    it('does not enhance query for non-alerts index', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      (runSearchTool as jest.Mock).mockResolvedValue({ results: mockResults });

      await tool.handler(
        { query: 'find documents', index: 'custom-index' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as ToolHandlerContext['modelProvider'],
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.nlQuery).toBe('find documents');
      expect(callArgs.nlQuery).not.toContain('KEEP clause');
    });

    it('logs debug message with correct parameters', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      (runSearchTool as jest.Mock).mockResolvedValue({ results: mockResults });

      await tool.handler(
        { query: 'test query', index: '.alerts-security.alerts-default', isCount: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as ToolHandlerContext['modelProvider'],
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'alerts tool called with query: test query, index: .alerts-security.alerts-default, isCount: true'
      );
    });

    it('returns normalized results envelope (raw contains runSearchTool output)', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      const runSearchToolResult = { results: mockResults };
      (runSearchTool as jest.Mock).mockResolvedValue(runSearchToolResult);

      const result = await tool.handler(
        { query: 'find alerts' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as ToolHandlerContext['modelProvider'],
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect((result.results[0] as any).data.operation).toBe('search');
      expect((result.results[0] as any).data.index).toBe(`${DEFAULT_ALERTS_INDEX}-default`);
      expect((result.results[0] as any).data.isCount).toBe(false);
      expect((result.results[0] as any).data.raw).toEqual(runSearchToolResult);
    });

    it('uses deterministic fallback DSL for structured host/user/hash queries (avoids LLM DSL failures)', async () => {
      (runSearchTool as jest.Mock).mockResolvedValue({ results: [] });
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { total: { value: 1, relation: 'eq' }, hits: [] },
      } as any);

      const result = await tool.handler(
        {
          query:
            'alerts on host SRVWIN02 or user Administrator or file hash 8dd620d9aeb35960bb766458c8890ede987c33d239cf730f93fe49d90ae759dd in the last 7 days',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as ToolHandlerContext['modelProvider'],
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      expect(runSearchTool).not.toHaveBeenCalled();
      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalled();

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect((result.results[0] as any).data.raw.strategy).toBe('fallback_dsl');
      expect((result.results[0] as any).data.index).toBe(`${DEFAULT_ALERTS_INDEX}-default`);
    });

    it('does deterministic get-by-id lookup when query requests an alert id (avoids misclassifying id as file hash)', async () => {
      (runSearchTool as jest.Mock).mockResolvedValue({ results: [] });
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { total: { value: 1, relation: 'eq' }, hits: [{ _id: 'abc', _source: {} }] },
      } as any);

      const alertId = '5eefb66806a174d0df2b95891489dc67edbedffaad6d9f39c1bf81d1555a3e83';
      const result = await tool.handler(
        { query: `Find the security alert with id "${alertId}".` },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as ToolHandlerContext['modelProvider'],
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      expect(runSearchTool).not.toHaveBeenCalled();
      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: `${DEFAULT_ALERTS_INDEX}-default`,
          size: 1,
        })
      );

      const callArgs = (mockEsClient.asCurrentUser.search as jest.Mock).mock.calls[0][0];
      expect(callArgs.query?.bool?.should).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ ids: { values: [alertId] } }),
          expect.objectContaining({ term: { 'kibana.alert.uuid': alertId } }),
        ])
      );

      expect(result.results).toHaveLength(1);
      expect((result.results[0] as any).data.raw.strategy).toBe('get_by_id');
      expect((result.results[0] as any).data.raw.alertId).toBe(alertId);
    });
  });
});
