/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult, type OtherResult } from '@kbn/agent-builder-common';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import type { coreMock } from '@kbn/core/server/mocks';
import { ALL_PRODUCT_FEATURE_KEYS, ProductFeatureKey } from '@kbn/security-solution-features/keys';
import { createProductFeaturesServiceMock } from '../../../lib/product_features_service/mocks';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../__mocks__/test_helpers';
import type { ExperimentalFeatures } from '../../../../common';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT } from '../../../lib/telemetry/event_based/events';
import { buildRenderAttachmentTag } from './attachment_utils';
import { buildEntityGraphAttachmentId } from './entity_graph_attachment_utils';
import { getEntityGraphTool, SECURITY_GET_ENTITY_GRAPH_TOOL_ID } from './get_entity_graph_tool';

jest.mock('../../utils/get_agent_builder_resource_availability', () => ({
  getAgentBuilderResourceAvailability: jest.fn(),
}));

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  executeEsql: jest.fn(),
}));

const mockGetAgentBuilderResourceAvailability = getAgentBuilderResourceAvailability as jest.Mock;
const mockExecuteEsql = executeEsql as jest.Mock;

const mockExperimentalFeatures = {
  entityAnalyticsEntityStoreV2: true,
} as ExperimentalFeatures;

const exactHostHit = {
  columns: [
    { name: 'entity.id', type: 'keyword' },
    { name: 'entity.name', type: 'keyword' },
    { name: 'entity.EngineMetadata.Type', type: 'keyword' },
  ],
  values: [['host:server1', 'server1', 'host']],
};

const expectedAttachmentId = buildEntityGraphAttachmentId('host', 'host:server1');
const defaultTimeRange = { from: 'now-30d', to: 'now' };

interface GraphSuccessData {
  attachmentId: string;
  version: number;
  renderTag: string;
}

describe('getEntityGraphTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const productFeaturesService = createProductFeaturesServiceMock();
  const tool = getEntityGraphTool(
    mockCore,
    mockLogger,
    mockExperimentalFeatures,
    productFeaturesService
  );
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;

  const mockHasAtLeast = jest.fn().mockReturnValue(true);
  const mockGetLicense = jest.fn().mockResolvedValue({ hasAtLeast: mockHasAtLeast });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient);
    mockGetAgentBuilderResourceAvailability.mockResolvedValue({ status: 'available' });
    mockHasAtLeast.mockReturnValue(true);
    mockCore.getStartServices.mockResolvedValue([
      mockCoreStart,
      { licensing: { getLicense: mockGetLicense } },
      {},
    ]);
  });

  describe('schema', () => {
    it('validates a prefixed entity id', () => {
      expect(tool.schema.safeParse({ entityType: 'host', entityId: 'host:server1' }).success).toBe(
        true
      );
    });

    it('allows an omitted entity type', () => {
      expect(tool.schema.safeParse({ entityId: 'server1' }).success).toBe(true);
    });

    it('rejects an empty entity id', () => {
      expect(tool.schema.safeParse({ entityId: '' }).success).toBe(false);
    });
  });

  describe('availability', () => {
    it('returns unavailable when the resource availability check fails', async () => {
      mockGetAgentBuilderResourceAvailability.mockResolvedValueOnce({ status: 'unavailable' });

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
    });

    it('returns unavailable when entity store v2 is disabled', async () => {
      const disabledTool = getEntityGraphTool(
        mockCore,
        mockLogger,
        { ...mockExperimentalFeatures, entityAnalyticsEntityStoreV2: false },
        productFeaturesService
      );

      const result = await disabledTool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
    });

    it('returns unavailable when the graphVisualization product feature is disabled', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(true);
      const gatedTool = getEntityGraphTool(
        mockCore,
        mockLogger,
        mockExperimentalFeatures,
        // Enable everything except graph visualization
        createProductFeaturesServiceMock(
          [...ALL_PRODUCT_FEATURE_KEYS].filter(
            (key) => key !== ProductFeatureKey.graphVisualization
          )
        )
      );

      const result = await gatedTool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
    });

    it('returns unavailable when the entity store v2 index does not exist', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(false);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toBe('Entity Store V2 index does not exist for this space');
    });

    it('returns available when all requirements are met', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(true);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('available');
      expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
        index: 'entities-latest-default',
      });
    });

    it('returns unavailable when the license is below Platinum', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(true);
      mockHasAtLeast.mockReturnValue(false);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
    });
  });

  describe('handler', () => {
    it('stores a security.entity_graph attachment and returns a renderTag on an exact single hit', async () => {
      mockExecuteEsql.mockResolvedValueOnce(exactHostHit);

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.attachments.getAttachmentRecord as jest.Mock).mockReturnValueOnce(undefined);
      (context.attachments.add as jest.Mock).mockResolvedValueOnce({
        id: expectedAttachmentId,
        current_version: 1,
      });

      const result = (await tool.handler(
        { entityType: 'host', entityId: 'host:server1' },
        context
      )) as ToolHandlerStandardReturn;

      expect(context.attachments.add).toHaveBeenCalledTimes(1);
      expect(context.attachments.add).toHaveBeenCalledWith({
        id: expectedAttachmentId,
        type: SecurityAgentBuilderAttachments.entityGraph,
        data: {
          identifierType: 'host',
          identifier: 'server1',
          entityStoreId: 'host:server1',
          timeRange: defaultTimeRange,
          attachmentLabel: 'Graph — host: server1',
        },
        description: 'Graph — host: server1',
      });
      expect(context.attachments.update).not.toHaveBeenCalled();

      expect(result.results).toHaveLength(1);
      const otherResult = result.results[0] as OtherResult<GraphSuccessData>;
      expect(otherResult.type).toBe(ToolResultType.other);
      expect(otherResult.data).toEqual({
        attachmentId: expectedAttachmentId,
        version: 1,
        renderTag: buildRenderAttachmentTag({ attachmentId: expectedAttachmentId, version: 1 }),
      });
    });

    it('resolves a bare id supplied from an attachment via the RLIKE prefix match', async () => {
      mockExecuteEsql
        // 1. exact id — miss
        .mockResolvedValueOnce({ columns: [{ name: 'entity.id', type: 'keyword' }], values: [] })
        // 2. exact name — miss
        .mockResolvedValueOnce({ columns: [{ name: 'entity.name', type: 'keyword' }], values: [] })
        // 3. entity.id RLIKE — single row whose stripped id equals the input
        .mockResolvedValueOnce(exactHostHit);

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.attachments.getAttachmentRecord as jest.Mock).mockReturnValueOnce(undefined);
      (context.attachments.add as jest.Mock).mockResolvedValueOnce({
        id: expectedAttachmentId,
        current_version: 1,
      });

      const result = (await tool.handler(
        { entityId: 'server1' },
        context
      )) as ToolHandlerStandardReturn;

      expect(context.attachments.add).toHaveBeenCalledTimes(1);
      const otherResult = result.results[0] as OtherResult<GraphSuccessData>;
      expect(otherResult.data).toEqual({
        attachmentId: expectedAttachmentId,
        version: 1,
        renderTag: buildRenderAttachmentTag({ attachmentId: expectedAttachmentId, version: 1 }),
      });
    });

    it('stamps the fixed default time window on the attachment', async () => {
      mockExecuteEsql.mockResolvedValueOnce(exactHostHit);

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.attachments.getAttachmentRecord as jest.Mock).mockReturnValueOnce(undefined);
      (context.attachments.add as jest.Mock).mockResolvedValueOnce({
        id: expectedAttachmentId,
        current_version: 1,
      });

      await tool.handler({ entityId: 'host:server1' }, context);

      expect(context.attachments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ timeRange: defaultTimeRange }),
        })
      );
    });

    it('bumps the existing attachment version on a repeat request for the same entity', async () => {
      mockExecuteEsql.mockResolvedValueOnce(exactHostHit);

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.attachments.getAttachmentRecord as jest.Mock).mockReturnValueOnce({
        id: expectedAttachmentId,
        current_version: 1,
      });
      (context.attachments.update as jest.Mock).mockResolvedValueOnce({
        id: expectedAttachmentId,
        current_version: 2,
      });

      const result = (await tool.handler(
        { entityType: 'host', entityId: 'host:server1' },
        context
      )) as ToolHandlerStandardReturn;

      expect(context.attachments.update).toHaveBeenCalledTimes(1);
      expect(context.attachments.add).not.toHaveBeenCalled();
      const otherResult = result.results[0] as OtherResult<GraphSuccessData>;
      expect(otherResult.data.version).toBe(2);
      expect(otherResult.data.renderTag).toBe(
        buildRenderAttachmentTag({ attachmentId: expectedAttachmentId, version: 2 })
      );
    });

    it('returns an ambiguous-match result (no attachment, no renderTag) for multiple candidates', async () => {
      mockExecuteEsql
        // 1. exact id — miss
        .mockResolvedValueOnce({ columns: [], values: [] })
        // 2. exact name — miss
        .mockResolvedValueOnce({ columns: [], values: [] })
        // 3. entity.id RLIKE — two rows
        .mockResolvedValueOnce({
          columns: [
            { name: 'entity.id', type: 'keyword' },
            { name: 'entity.name', type: 'keyword' },
          ],
          values: [
            ['host:server1', 'server1'],
            ['host:server10', 'server10'],
          ],
        });

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

      const result = (await tool.handler(
        { entityId: 'server' },
        context
      )) as ToolHandlerStandardReturn;

      expect(context.attachments.add).not.toHaveBeenCalled();
      expect(context.attachments.update).not.toHaveBeenCalled();
      expect(result.results).toHaveLength(1);
      const otherResult = result.results[0] as OtherResult<{
        message: string;
        candidateEntityIds: string[];
      }>;
      expect(otherResult.type).toBe(ToolResultType.other);
      expect(otherResult.data.candidateEntityIds).toEqual(['host:server1', 'host:server10']);
      expect(otherResult.data).not.toHaveProperty('renderTag');
    });

    it('returns an error result when no entity is found', async () => {
      mockExecuteEsql
        .mockResolvedValueOnce({ columns: [], values: [] })
        .mockResolvedValueOnce({ columns: [], values: [] })
        .mockResolvedValueOnce({ columns: [], values: [] })
        .mockResolvedValueOnce({ columns: [], values: [] });

      const result = (await tool.handler(
        { entityId: 'ghost' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('No entity found for id: ghost');
    });

    it('returns an error when the resolved entity has no canonical entity.id', async () => {
      mockExecuteEsql
        // 1. exact id — miss
        .mockResolvedValueOnce({ columns: [{ name: 'entity.id', type: 'keyword' }], values: [] })
        // 2. exact name — single hit but no entity.id column
        .mockResolvedValueOnce({
          columns: [
            { name: 'entity.name', type: 'keyword' },
            { name: 'entity.EngineMetadata.Type', type: 'keyword' },
          ],
          values: [['server1', 'host']],
        });

      const result = (await tool.handler(
        { entityId: 'server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('no canonical entity.id');
    });

    it('returns an error (no renderTag) when persisting the attachment fails', async () => {
      mockExecuteEsql.mockResolvedValueOnce(exactHostHit);

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.attachments.getAttachmentRecord as jest.Mock).mockReturnValueOnce(undefined);
      (context.attachments.add as jest.Mock).mockRejectedValueOnce(new Error('persist failed'));

      const result = (await tool.handler(
        { entityType: 'host', entityId: 'host:server1' },
        context
      )) as ToolHandlerStandardReturn;

      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data).not.toHaveProperty('renderTag');
      expect(errorResult.data.message).toContain('could not be prepared');
    });

    it('returns an error result when the ES|QL query fails', async () => {
      mockExecuteEsql.mockRejectedValueOnce(new Error('ES|QL failure'));

      const result = (await tool.handler(
        { entityId: 'host:server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain(
        'Error rendering entity graph preview: ES|QL failure'
      );
    });
  });

  describe('telemetry', () => {
    it('reports success=true and resultCount=1 when the graph attachment is stored', async () => {
      mockExecuteEsql.mockResolvedValueOnce(exactHostHit);

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.attachments.getAttachmentRecord as jest.Mock).mockReturnValueOnce(undefined);
      (context.attachments.add as jest.Mock).mockResolvedValueOnce({
        id: expectedAttachmentId,
        current_version: 1,
      });

      await tool.handler({ entityType: 'host', entityId: 'host:server1' }, context);

      expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
        ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
        {
          toolId: SECURITY_GET_ENTITY_GRAPH_TOOL_ID,
          actionType: 'read',
          entityTypes: ['host'],
          spaceId: 'default',
          success: true,
          resultCount: 1,
          errorMessage: undefined,
          userConfirmationOutcome: undefined,
        }
      );
    });

    it('reports success=false with the error message when the query throws', async () => {
      mockExecuteEsql.mockRejectedValueOnce(new Error('ES|QL failure'));

      await tool.handler(
        { entityType: 'host', entityId: 'host:server1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
        ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
        expect.objectContaining({ success: false, errorMessage: 'ES|QL failure', resultCount: 0 })
      );
    });
  });
});
