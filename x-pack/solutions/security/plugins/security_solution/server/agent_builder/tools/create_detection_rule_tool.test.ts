/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { z } from '@kbn/zod';
import type { ExperimentalFeatures } from '../../../common';
import { coreMock } from '@kbn/core/server/mocks';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import {
  createDetectionRuleTool,
  SECURITY_CREATE_DETECTION_RULE_TOOL_ID,
} from './create_detection_rule_tool';
import { getBuildAgent } from '../../lib/detection_engine/ai_rule_creation/agent';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';

jest.mock('../../lib/detection_engine/ai_rule_creation/agent', () => ({
  getBuildAgent: jest.fn(),
}));

jest.mock('../utils/get_agent_builder_resource_availability', () => ({
  getAgentBuilderResourceAvailability: jest.fn(),
}));

const mockGetBuildAgent = getBuildAgent as jest.Mock;
const mockGetAgentBuilderResourceAvailability = getAgentBuilderResourceAvailability as jest.Mock;
const userQuery = 'Create a rule to detect suspicious activity';

describe('createDetectionRuleTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const mockModelProvider = {
    getDefaultModel: jest.fn().mockResolvedValue({
      chatModel: {
        getConnector: jest.fn().mockReturnValue({ connectorId: 'test-connector-id' }),
      },
    }),
    getModel: jest.fn(),
    getUsageStats: jest.fn(),
  };
  const mockEvents = {
    reportProgress: jest.fn(),
    sendUiEvent: jest.fn(),
  };
  const mockExperimentalFeatures = { aiRuleCreationEnabled: true } as ExperimentalFeatures;
  const tool = createDetectionRuleTool(
    mockCore,
    mockLogger,
    mockExperimentalFeatures
  ) as BuiltinToolDefinition<z.ZodObject<{ user_query: z.ZodString }>>;

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
    mockGetAgentBuilderResourceAvailability.mockResolvedValue({
      status: 'available',
    });
  });

  describe('schema', () => {
    it('validates correct schema with required user_query', () => {
      const validInput = {
        user_query: 'Create a rule to detect suspicious login attempts',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('rejects missing user_query', () => {
      const invalidInput = {};

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects non-string user_query', () => {
      const invalidInput = {
        user_query: 123,
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });
  });

  describe('tool properties', () => {
    it('returns correct tool id', () => {
      expect(tool.id).toBe(SECURITY_CREATE_DETECTION_RULE_TOOL_ID);
    });

    it('has correct tags', () => {
      expect(tool.tags).toEqual(['security', 'detection', 'rule-creation', 'siem']);
    });
  });

  describe('availability', () => {
    it('returns unavailable when experimental feature is disabled', async () => {
      const toolWithFeatureDisabled = createDetectionRuleTool(mockCore, mockLogger, {
        aiRuleCreationEnabled: false,
      } as ExperimentalFeatures);

      const availability = await toolWithFeatureDisabled.availability?.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(availability).toEqual({
        status: 'unavailable',
        reason:
          'AI rule creation is not enabled. Enable it via experimental feature flag "aiRuleCreationEnabled".',
      });
    });

    it('returns available status when experimental feature is enabled', async () => {
      mockGetAgentBuilderResourceAvailability.mockResolvedValue({
        status: 'available',
      });

      const availability = await tool.availability?.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(availability).toEqual({ status: 'available' });
    });
  });

  describe('handler', () => {
    const mockIterativeAgent = {
      invoke: jest.fn(),
    };

    beforeEach(() => {
      mockGetBuildAgent.mockResolvedValue(mockIterativeAgent);
      const coreStart = coreMock.createStart();
      Object.assign(coreStart.elasticsearch.client, {
        asInternalUser: mockEsClient.asInternalUser,
        asCurrentUser: mockEsClient.asCurrentUser,
      });
      mockCore.getStartServices.mockResolvedValue([
        coreStart,
        {
          alerting: {
            getRulesClientWithRequest: jest.fn().mockResolvedValue({}),
          },
          inference: {},
        },
        {},
      ]);
    });

    it('returns rule as success result', async () => {
      const mockRule = {
        name: 'Test Rule',
        query: 'FROM test | limit 100',
        language: 'esql',
        type: 'esql',
      };
      mockIterativeAgent.invoke.mockResolvedValue({
        rule: mockRule,
        errors: [],
      });

      const result = await tool.handler(
        { user_query: userQuery },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents,
        })
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              success: true,
              rule: mockRule,
            },
          },
        ],
      });
      expect(mockIterativeAgent.invoke).toHaveBeenCalledWith({ userQuery });
    });

    it('returns error when connector ID is not available', async () => {
      const mockModelProviderWithoutConnector = {
        ...mockModelProvider,
        getDefaultModel: jest.fn().mockResolvedValue({
          chatModel: {
            getConnector: jest.fn().mockReturnValue({ connectorId: null }),
          },
        }),
      };

      const result = await tool.handler(
        { user_query: userQuery },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProviderWithoutConnector,
          events: mockEvents,
        })
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'No connector ID provided and no default connector available',
            },
          },
        ],
      });
    });

    it('returns error graph creates rule with errors', async () => {
      const mockErrors = ['Error 1', 'Error 2'];
      mockIterativeAgent.invoke.mockResolvedValue({
        rule: null,
        errors: mockErrors,
      });

      const result = await tool.handler(
        { user_query: userQuery },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents,
        })
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to create detection rule: ${mockErrors.join('; ')}`,
              errors: mockErrors,
            },
          },
        ],
      });
    });

    it('handles exceptions and returns error result', async () => {
      const mockError = new Error('Test error');
      mockGetBuildAgent.mockRejectedValue(mockError);

      const result = await tool.handler(
        { user_query: userQuery },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents,
        })
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to create detection rule: ${mockError.message}`,
              error: mockError.toString(),
            },
          },
        ],
      });
    });

    it('initiates agent with correct parameters', async () => {
      mockIterativeAgent.invoke.mockResolvedValue({
        rule: { name: 'Test Rule' },
        errors: [],
      });

      await tool.handler(
        { user_query: userQuery },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents,
        })
      );

      expect(mockGetBuildAgent).toHaveBeenCalledWith({
        model: expect.objectContaining({
          getConnector: expect.any(Function),
        }),
        logger: mockLogger,
        inference: expect.any(Object),
        connectorId: 'test-connector-id',
        request: mockRequest,
        esClient: mockEsClient.asCurrentUser,
        savedObjectsClient: expect.any(Object),
        rulesClient: expect.any(Object),
        events: mockEvents,
      });
    });
  });
});
