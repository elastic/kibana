/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
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
    it('calls runSearchTool with the wildcard alerts pattern when index not provided and passes KEEP clause guidance via customInstructions (not concatenated to NL query)', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      (runSearchTool as jest.Mock).mockResolvedValue({ results: mockResults });
      const fieldsList = ESSENTIAL_ALERT_FIELDS.map((field) => `\`${field}\``).join(', ');

      await tool.handler(
        { query: 'find all alerts' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      // ES|QL cannot resolve the per-space alias `${DEFAULT_ALERTS_INDEX}-<space>`
      // as a data source. The default targets the wildcard pattern instead, and
      // `allowPatternTarget: true` lets the search subgraph honor it verbatim.
      expect(callArgs.index).toBe(`${DEFAULT_ALERTS_INDEX}-*`);
      expect(callArgs.allowPatternTarget).toBe(true);
      // NL query stays clean — no boilerplate concatenation
      expect(callArgs.nlQuery).toBe('find all alerts');
      expect(callArgs.nlQuery).not.toContain('KEEP clause');
      // Static guidance flows through customInstructions instead
      expect(callArgs.customInstructions).toContain('KEEP clause');
      expect(callArgs.customInstructions).toContain(fieldsList);
    });

    it('uses the wildcard alerts pattern regardless of handler context spaceId (alias is not ES|QL-resolvable)', async () => {
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
      // Whatever the spaceId is, the default targets the wildcard pattern.
      // (Cross-space safety is enforced by RBAC on the underlying indices.)
      expect(callArgs.index).toBe(`${DEFAULT_ALERTS_INDEX}-*`);
      expect(callArgs.allowPatternTarget).toBe(true);
    });

    it('keeps allowPatternTarget=true even when an explicit index is provided (callers may pass a pattern)', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      (runSearchTool as jest.Mock).mockResolvedValue({ results: mockResults });

      await tool.handler(
        { query: 'find alerts', index: '.alerts-security.alerts-custom' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.index).toBe('.alerts-security.alerts-custom');
      expect(callArgs.allowPatternTarget).toBe(true);
      expect(callArgs.nlQuery).toBe('find alerts');
      expect(callArgs.customInstructions).toContain('KEEP clause');
    });

    it('passes KEEP clause + wildcard guidance via customInstructions for an alerts index (NL query unchanged)', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      (runSearchTool as jest.Mock).mockResolvedValue({ results: mockResults });
      const fieldsList = ESSENTIAL_ALERT_FIELDS.map((field) => `\`${field}\``).join(', ');

      await tool.handler(
        { query: 'find alerts', index: '.alerts-security.alerts-default' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.nlQuery).toBe('find alerts');
      expect(callArgs.nlQuery).not.toContain('KEEP clause');
      expect(callArgs.customInstructions).toContain('KEEP clause');
      expect(callArgs.customInstructions).toContain(fieldsList);
      expect(callArgs.customInstructions).toContain('leading dot');
      // The instruction MUST steer the dispatcher toward the wildcard form,
      // not the per-space alias. Mirror-iter4: REPORT_ITER3.md captures the
      // alias-form failure mode in detail.
      expect(callArgs.customInstructions).toContain('.alerts-security.alerts-*');
      expect(callArgs.customInstructions).toContain(
        'ES|QL cannot resolve that alias as a data source'
      );
    });

    it('appends count guidance to customInstructions when isCount is true (NL query unchanged)', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      (runSearchTool as jest.Mock).mockResolvedValue({ results: mockResults });

      await tool.handler(
        { query: 'how many alerts', index: '.alerts-security.alerts-default', isCount: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.nlQuery).toBe('how many alerts');
      expect(callArgs.nlQuery).not.toContain('count query');
      expect(callArgs.customInstructions).toContain('KEEP clause');
      expect(callArgs.customInstructions).toContain('count query');
      expect(callArgs.customInstructions).toContain('STATS count = COUNT(*)');
    });

    it('does not set customInstructions for non-alerts index and leaves NL query untouched', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      (runSearchTool as jest.Mock).mockResolvedValue({ results: mockResults });

      await tool.handler(
        { query: 'find documents', index: 'custom-index' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.nlQuery).toBe('find documents');
      expect(callArgs.customInstructions).toBeUndefined();
    });

    it('logs debug message with correct parameters', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      (runSearchTool as jest.Mock).mockResolvedValue({ results: mockResults });

      await tool.handler(
        { query: 'test query', index: '.alerts-security.alerts-default', isCount: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'alerts tool called with query: test query, index: .alerts-security.alerts-default, isCount: true'
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
