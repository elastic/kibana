/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolHandlerContext, createToolTestMocks } from '../__mocks__/test_helpers';
import { mitreMappingTool } from './mitre_mapping_tool';

describe('mitreMappingTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = mitreMappingTool(mockCore, mockLogger);

  const mockMappingsResponse = {
    mappings: [
      {
        indicator: 'lateral movement via PsExec',
        techniques: [
          {
            technique_id: 'T1570',
            technique_name: 'Lateral Tool Transfer',
            tactic: 'Lateral Movement',
            confidence: 0.95,
            reasoning: 'PsExec is commonly used for lateral movement',
          },
        ],
      },
    ],
  };

  const createMockModelProvider = (responseContent: string) => ({
    getDefaultModel: jest.fn().mockResolvedValue({
      chatModel: {
        invoke: jest.fn().mockResolvedValue({ content: responseContent }),
      },
    }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('schema', () => {
    it('validates correct indicators array', () => {
      const validInput = {
        indicators: ['lateral movement via PsExec', 'credential dumping from LSASS'],
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('rejects empty indicators array', () => {
      const invalidInput = {
        indicators: [],
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects missing indicators', () => {
      const invalidInput = {};

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects non-array indicators', () => {
      const invalidInput = {
        indicators: 'lateral movement via PsExec',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('accepts optional context', () => {
      const validInput = {
        indicators: ['suspicious PowerShell execution'],
        context: 'Windows server environment with Active Directory',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates without context', () => {
      const validInput = {
        indicators: ['suspicious PowerShell execution'],
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });
  });

  describe('handler', () => {
    it('invokes model and returns parsed mappings', async () => {
      const mockModelProvider = createMockModelProvider(
        JSON.stringify(mockMappingsResponse)
      );

      const result = (await tool.handler(
        { indicators: ['lateral movement via PsExec'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as never,
        })
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          mappings: mockMappingsResponse.mappings,
          indicator_count: 1,
          technique_count: 1,
        })
      );
    });

    it('handles multiple indicators and techniques', async () => {
      const multiMappingsResponse = {
        mappings: [
          {
            indicator: 'lateral movement via PsExec',
            techniques: [
              {
                technique_id: 'T1570',
                technique_name: 'Lateral Tool Transfer',
                tactic: 'Lateral Movement',
                confidence: 0.95,
                reasoning: 'PsExec is commonly used for lateral movement',
              },
            ],
          },
          {
            indicator: 'credential dumping from LSASS',
            techniques: [
              {
                technique_id: 'T1003.001',
                technique_name: 'LSASS Memory',
                tactic: 'Credential Access',
                confidence: 0.98,
                reasoning: 'LSASS memory dumping is a well-known credential access technique',
              },
              {
                technique_id: 'T1003',
                technique_name: 'OS Credential Dumping',
                tactic: 'Credential Access',
                confidence: 0.9,
                reasoning: 'Parent technique for credential dumping',
              },
            ],
          },
        ],
      };

      const mockModelProvider = createMockModelProvider(
        JSON.stringify(multiMappingsResponse)
      );

      const result = (await tool.handler(
        {
          indicators: ['lateral movement via PsExec', 'credential dumping from LSASS'],
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as never,
        })
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          indicator_count: 2,
          technique_count: 3,
        })
      );
    });

    it('passes context to the model when provided', async () => {
      const mockModelProvider = createMockModelProvider(
        JSON.stringify(mockMappingsResponse)
      );

      await tool.handler(
        {
          indicators: ['suspicious PowerShell execution'],
          context: 'Windows server environment',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as never,
        })
      );

      const chatModel = (await mockModelProvider.getDefaultModel()).chatModel;
      const invokeArgs = chatModel.invoke.mock.calls[0][0];
      const userMessage = invokeArgs[1].content;
      expect(userMessage).toContain('Additional context: Windows server environment');
    });

    it('handles response wrapped in markdown code blocks', async () => {
      const wrappedResponse = `\`\`\`json\n${JSON.stringify(mockMappingsResponse)}\n\`\`\``;
      const mockModelProvider = createMockModelProvider(wrappedResponse);

      const result = (await tool.handler(
        { indicators: ['lateral movement via PsExec'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as never,
        })
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          mappings: mockMappingsResponse.mappings,
        })
      );
    });

    it('handles JSON parse errors when no JSON found in response', async () => {
      const mockModelProvider = createMockModelProvider(
        'I cannot provide MITRE mappings for this input.'
      );

      const result = (await tool.handler(
        { indicators: ['some vague indicator'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as never,
        })
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Failed to parse MITRE mapping response');
    });

    it('handles model invocation errors', async () => {
      const mockModelProvider = {
        getDefaultModel: jest.fn().mockResolvedValue({
          chatModel: {
            invoke: jest.fn().mockRejectedValue(new Error('Model invocation failed')),
          },
        }),
      };

      const result = (await tool.handler(
        { indicators: ['lateral movement via PsExec'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as never,
        })
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Model invocation failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('handles getDefaultModel errors', async () => {
      const mockModelProvider = {
        getDefaultModel: jest.fn().mockRejectedValue(new Error('No model configured')),
      };

      const result = (await tool.handler(
        { indicators: ['lateral movement via PsExec'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider as never,
        })
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('No model configured');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
