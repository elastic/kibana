/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { coreMock } from '@kbn/core/server/mocks';
import { ToolResultType, type ErrorResult, type OtherResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../../__mocks__/test_helpers';
import type { ExperimentalFeatures } from '../../../../../common';
import { ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT } from '../../../../lib/telemetry/event_based/events';
import { getResolutionToolAvailability } from './resolution_availability';
import {
  listResolutionRulesTool,
  SECURITY_LIST_RESOLUTION_RULES_TOOL_ID,
} from './list_resolution_rules_tool';

const mockGetEffectiveRules = jest.fn();
const mockCreateResolutionRulesClient = jest.fn().mockReturnValue({
  getEffectiveRules: mockGetEffectiveRules,
});

jest.mock('./resolution_availability', () => ({
  getResolutionToolAvailability: jest.fn(),
}));

const mockGetResolutionToolAvailability = getResolutionToolAvailability as jest.Mock;

const mockExperimentalFeatures = {
  entityAnalyticsEntityStoreV2: true,
} as ExperimentalFeatures;

describe('listResolutionRulesTool', () => {
  const {
    mockCore,
    mockLogger,
    mockEsClient,
    mockRequest,
    mockSecurityStart,
    mockCheckPrivileges,
  } = createToolTestMocks();
  const tool = listResolutionRulesTool(mockCore, mockLogger, mockExperimentalFeatures);
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient, mockSecurityStart);
    mockCreateResolutionRulesClient.mockReturnValue({ getEffectiveRules: mockGetEffectiveRules });
    mockCore.getStartServices.mockResolvedValue([
      mockCoreStart,
      {
        entityStore: { createResolutionRulesClient: mockCreateResolutionRulesClient },
        security: mockSecurityStart,
      },
      {},
    ]);
    mockGetResolutionToolAvailability.mockResolvedValue({ status: 'available' });
  });

  describe('availability', () => {
    it('delegates to getResolutionToolAvailability', async () => {
      mockGetResolutionToolAvailability.mockResolvedValueOnce({ status: 'unavailable' });

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
    });
  });

  describe('schema', () => {
    it('accepts an empty payload', () => {
      expect(tool.schema.safeParse({}).success).toBe(true);
    });
  });

  describe('handler', () => {
    it('returns the effective rules as an other result', async () => {
      const rules = [
        { id: 'email_exact_match', enabled: true },
        { id: 'windows_sid_bridge', enabled: false },
      ];
      mockGetEffectiveRules.mockResolvedValueOnce(rules);

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      const result = (await tool.handler({}, context)) as ToolHandlerStandardReturn;

      expect(mockCreateResolutionRulesClient).toHaveBeenCalledWith(
        context.savedObjectsClient,
        'default'
      );
      const other = result.results[0] as OtherResult;
      expect(other.type).toBe(ToolResultType.other);
      expect(other.data).toEqual({ rules });
    });

    it('returns an error result when the user lacks permission to view resolution rules', async () => {
      mockCheckPrivileges.mockResolvedValueOnce({ hasAllRequested: false });

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(mockGetEffectiveRules).not.toHaveBeenCalled();
      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('permission');
    });

    it('returns an error result when the client throws', async () => {
      mockGetEffectiveRules.mockRejectedValueOnce(new Error('boom'));

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('boom');
    });
  });

  describe('telemetry', () => {
    it('reports success=true with the rule count', async () => {
      mockGetEffectiveRules.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);

      await tool.handler({}, createToolHandlerContext(mockRequest, mockEsClient, mockLogger));

      expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
        ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
        expect.objectContaining({
          toolId: SECURITY_LIST_RESOLUTION_RULES_TOOL_ID,
          actionType: 'read',
          success: true,
          resultCount: 2,
        })
      );
    });
  });
});
