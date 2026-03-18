/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { coreMock } from '@kbn/core/server/mocks';
import type { ExperimentalFeatures } from '../../../common';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import { manageRulesTool, SECURITY_MANAGE_RULES_TOOL_ID } from './manage_rules_tool';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';

jest.mock('../utils/get_agent_builder_resource_availability', () => ({
  getAgentBuilderResourceAvailability: jest.fn(),
}));

const mockGetAgentBuilderResourceAvailability = getAgentBuilderResourceAvailability as jest.Mock;

describe('manageRulesTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const mockExperimentalFeatures = { aiRuleCreationEnabled: true } as ExperimentalFeatures;

  const mockRulesClient = {
    find: jest.fn(),
    get: jest.fn(),
    enableRule: jest.fn(),
    disableRule: jest.fn(),
    create: jest.fn(),
  };

  const tool = manageRulesTool(mockCore, mockLogger, mockExperimentalFeatures);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
    mockGetAgentBuilderResourceAvailability.mockResolvedValue({ status: 'available' });

    const coreStart = coreMock.createStart();
    mockCore.getStartServices.mockResolvedValue([
      coreStart,
      { alerting: { getRulesClientWithRequest: jest.fn().mockResolvedValue(mockRulesClient) } },
      {},
    ]);
  });

  describe('schema', () => {
    it('validates enable operation', () => {
      const result = tool.schema.safeParse({
        operation: 'enable',
        rule_ids: ['rule-1'],
      });
      expect(result.success).toBe(true);
    });

    it('validates disable operation', () => {
      const result = tool.schema.safeParse({
        operation: 'disable',
        rule_ids: ['rule-1', 'rule-2'],
      });
      expect(result.success).toBe(true);
    });

    it('validates duplicate operation', () => {
      const result = tool.schema.safeParse({
        operation: 'duplicate',
        rule_ids: ['rule-1'],
      });
      expect(result.success).toBe(true);
    });

    it('validates install_prebuilt operation', () => {
      const result = tool.schema.safeParse({
        operation: 'install_prebuilt',
      });
      expect(result.success).toBe(true);
    });

    it('validates operation with query instead of rule_ids', () => {
      const result = tool.schema.safeParse({
        operation: 'enable',
        query: 'alert.attributes.enabled: false',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing operation', () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects invalid operation', () => {
      const result = tool.schema.safeParse({
        operation: 'delete',
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-string rule_ids', () => {
      const result = tool.schema.safeParse({
        operation: 'enable',
        rule_ids: [123],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('tool properties', () => {
    it('returns correct tool id', () => {
      expect(tool.id).toBe(SECURITY_MANAGE_RULES_TOOL_ID);
    });

    it('has correct tags', () => {
      expect(tool.tags).toEqual(['security', 'detection', 'rules', 'management']);
    });
  });

  describe('availability', () => {
    it('returns unavailable when experimental feature is disabled', async () => {
      const toolWithFeatureDisabled = manageRulesTool(mockCore, mockLogger, {
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
      const availability = await tool.availability?.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(availability).toEqual({ status: 'available' });
    });
  });

  describe('handler', () => {
    it('enables rules by IDs', async () => {
      const result = await tool.handler(
        { operation: 'enable', rule_ids: ['rule-1', 'rule-2'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockRulesClient.enableRule).toHaveBeenCalledTimes(2);
      expect(mockRulesClient.enableRule).toHaveBeenCalledWith({ id: 'rule-1' });
      expect(mockRulesClient.enableRule).toHaveBeenCalledWith({ id: 'rule-2' });
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: 'Successfully enabled 2 rule(s).',
              rule_ids: ['rule-1', 'rule-2'],
            },
          },
        ],
      });
    });

    it('disables rules by IDs', async () => {
      const result = await tool.handler(
        { operation: 'disable', rule_ids: ['rule-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockRulesClient.disableRule).toHaveBeenCalledTimes(1);
      expect(mockRulesClient.disableRule).toHaveBeenCalledWith({ id: 'rule-1' });
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: 'Successfully disabled 1 rule(s).',
              rule_ids: ['rule-1'],
            },
          },
        ],
      });
    });

    it('duplicates a rule', async () => {
      mockRulesClient.get.mockResolvedValue({
        id: 'rule-1',
        name: 'Original Rule',
        alertTypeId: 'siem.queryRule',
        consumer: 'siem',
        schedule: { interval: '5m' },
        tags: ['test'],
        params: { type: 'query', query: 'process.name: cmd.exe' },
        throttle: null,
        notifyWhen: null,
        actions: [],
      });
      mockRulesClient.create.mockResolvedValue({
        id: 'rule-1-copy',
        name: 'Original Rule (copy)',
      });

      const result = await tool.handler(
        { operation: 'duplicate', rule_ids: ['rule-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockRulesClient.get).toHaveBeenCalledWith({ id: 'rule-1' });
      expect(mockRulesClient.create).toHaveBeenCalledWith({
        data: {
          name: 'Original Rule (copy)',
          enabled: false,
          alertTypeId: 'siem.queryRule',
          consumer: 'siem',
          schedule: { interval: '5m' },
          tags: ['test'],
          params: { type: 'query', query: 'process.name: cmd.exe' },
          throttle: undefined,
          notifyWhen: undefined,
          actions: [],
        },
      });
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: 'Successfully duplicated 1 rule(s).',
              duplicated: [
                { original_id: 'rule-1', new_id: 'rule-1-copy', name: 'Original Rule (copy)' },
              ],
            },
          },
        ],
      });
    });

    it('install_prebuilt returns instruction message', async () => {
      const result = await tool.handler(
        { operation: 'install_prebuilt' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              message:
                'To install prebuilt rules, use the Kibana API: PUT /api/detection_engine/rules/prepackaged. This operation requires the Security app to be properly configured.',
              operation: 'install_prebuilt',
            },
          },
        ],
      });
      expect(mockRulesClient.find).not.toHaveBeenCalled();
    });

    it('returns error when no rule_ids or query provided for enable', async () => {
      const result = await tool.handler(
        { operation: 'enable' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'Either rule_ids or query must be provided for this operation.',
            },
          },
        ],
      });
    });

    it('resolves rule IDs from query when rule_ids not provided', async () => {
      mockRulesClient.find.mockResolvedValue({
        data: [{ id: 'found-1' }, { id: 'found-2' }],
      });

      const result = await tool.handler(
        { operation: 'enable', query: 'alert.attributes.enabled: false' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockRulesClient.find).toHaveBeenCalledWith({
        options: {
          filter: 'alert.attributes.enabled: false',
          perPage: 100,
        },
      });
      expect(mockRulesClient.enableRule).toHaveBeenCalledTimes(2);
      expect(mockRulesClient.enableRule).toHaveBeenCalledWith({ id: 'found-1' });
      expect(mockRulesClient.enableRule).toHaveBeenCalledWith({ id: 'found-2' });
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: 'Successfully enabled 2 rule(s).',
              rule_ids: ['found-1', 'found-2'],
            },
          },
        ],
      });
    });

    it('handles errors', async () => {
      mockRulesClient.enableRule.mockRejectedValue(new Error('Permission denied'));

      const result = await tool.handler(
        { operation: 'enable', rule_ids: ['rule-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'Error managing rules: Permission denied',
            },
          },
        ],
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
