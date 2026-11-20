/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult, type OtherResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import type { coreMock } from '@kbn/core/server/mocks';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../../__mocks__/test_helpers';
import type { ExperimentalFeatures } from '../../../../../common';
import { ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT } from '../../../../lib/telemetry/event_based/events';
import { requireResolvedEntity } from '../entity_resolution';
import { getResolutionToolAvailability } from './resolution_availability';
import {
  getResolutionGroupTool,
  SECURITY_GET_RESOLUTION_GROUP_TOOL_ID,
} from './get_resolution_group_tool';

jest.mock('../entity_resolution', () => ({
  requireResolvedEntity: jest.fn(),
}));

jest.mock('./resolution_availability', () => ({
  getResolutionToolAvailability: jest.fn(),
}));

const mockRequireResolvedEntity = requireResolvedEntity as jest.Mock;
const mockGetResolutionToolAvailability = getResolutionToolAvailability as jest.Mock;

const mockExperimentalFeatures = {
  entityAnalyticsEntityStoreV2: true,
} as ExperimentalFeatures;

describe('getResolutionGroupTool', () => {
  const {
    mockCore,
    mockLogger,
    mockEsClient,
    mockRequest,
    mockSecurityStart,
    mockCheckPrivileges,
  } = createToolTestMocks();
  const tool = getResolutionGroupTool(mockCore, mockLogger, mockExperimentalFeatures);
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;
  const mockGetResolutionGroup = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient);
    mockCore.getStartServices.mockResolvedValue([
      mockCoreStart,
      {
        entityStore: {
          createResolutionClient: jest.fn().mockReturnValue({
            getResolutionGroup: mockGetResolutionGroup,
          }),
        },
        security: mockSecurityStart,
      },
      {},
    ]);
    mockGetResolutionToolAvailability.mockResolvedValue({ status: 'available' });
    mockRequireResolvedEntity.mockResolvedValue({
      ok: true,
      identity: { identifierType: 'host', identifier: 'server1', entityStoreId: 'host:server1' },
    });
  });

  describe('schema', () => {
    it('accepts a valid entityId', () => {
      expect(tool.schema.safeParse({ entityId: 'host:server1' }).success).toBe(true);
    });

    it('allows an omitted entityType', () => {
      expect(tool.schema.safeParse({ entityId: 'server1' }).success).toBe(true);
    });

    it('rejects an empty entityId', () => {
      expect(tool.schema.safeParse({ entityId: '' }).success).toBe(false);
    });
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

  describe('handler', () => {
    it('resolves the entity then returns the resolution group data', async () => {
      mockRequireResolvedEntity.mockResolvedValueOnce({
        ok: true,
        identity: { identifierType: 'user', identifier: 'alice', entityStoreId: 'user:alice' },
      });
      mockGetResolutionGroup.mockResolvedValueOnce({
        entity_type: 'user',
        group_size: 2,
        target: {
          entity: {
            id: 'user:alice',
            name: 'alice',
            EngineMetadata: { Type: 'user' },
            risk: { calculated_score_norm: 90 },
            attributes: { watchlists: ['vip'] },
          },
          user: { full_name: 'Alice Admin' },
        },
        aliases: [
          {
            'entity.id': 'user:alice.contractor',
            'entity.name': 'alice.contractor',
            'entity.EngineMetadata.Type': 'user',
            'user.full_name': ['Alice Contractor'],
            'entity.relationships.resolution.resolved_to': 'user:alice',
            entity: { source: ['okta'], lifecycle: { last_activity: '2026-01-01' } },
          },
        ],
      });

      const result = (await tool.handler(
        { entityId: 'alice', entityType: 'user' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(mockGetResolutionGroup).toHaveBeenCalledWith('user:alice');
      const other = result.results[0] as OtherResult;
      expect(other.type).toBe(ToolResultType.other);
      expect(other.data).toEqual({
        entityId: 'user:alice',
        entityType: 'user',
        groupSize: 2,
        target: { entityId: 'user:alice', name: 'alice', entityType: 'user' },
        aliases: [
          {
            entityId: 'user:alice.contractor',
            name: 'alice.contractor',
            entityType: 'user',
          },
        ],
      });
    });

    it('returns the not-resolved results as-is when the entity cannot be resolved', async () => {
      const notFoundResult = {
        tool_result_id: 'x',
        type: ToolResultType.error,
        data: { message: 'No entity found' },
      };
      mockRequireResolvedEntity.mockResolvedValueOnce({ ok: false, result: notFoundResult });

      const result = (await tool.handler(
        { entityId: 'ghost' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(mockGetResolutionGroup).not.toHaveBeenCalled();
      expect(result.results).toEqual([notFoundResult]);
    });

    it('returns an error result when the user lacks permission to view resolution groups', async () => {
      mockCheckPrivileges.mockResolvedValueOnce({ hasAllRequested: false });

      const result = (await tool.handler(
        { entityId: 'host:server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(mockGetResolutionGroup).not.toHaveBeenCalled();
      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('permission');
    });

    it('returns an error result when the resolution client throws', async () => {
      mockGetResolutionGroup.mockRejectedValueOnce(new Error('boom'));

      const result = (await tool.handler(
        { entityId: 'host:server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('boom');
    });
  });

  describe('telemetry', () => {
    it('reports success=true and resultCount=1 on success', async () => {
      mockGetResolutionGroup.mockResolvedValueOnce({
        entity_type: 'host',
        group_size: 1,
        target: {},
        aliases: [],
      });

      await tool.handler(
        { entityId: 'host:server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
        ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
        expect.objectContaining({
          toolId: SECURITY_GET_RESOLUTION_GROUP_TOOL_ID,
          actionType: 'read',
          success: true,
          resultCount: 1,
        })
      );
    });

    it('reports the failure with resultCount 0 when the entity cannot be resolved', async () => {
      mockRequireResolvedEntity.mockResolvedValueOnce({
        ok: false,
        result: { tool_result_id: 'x', type: ToolResultType.error, data: { message: 'nope' } },
      });

      await tool.handler(
        { entityId: 'ghost' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
        ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
        expect.objectContaining({ success: false, errorMessage: 'nope', resultCount: 0 })
      );
    });
  });
});
