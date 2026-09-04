/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { coreMock } from '@kbn/core/server/mocks';
import { ToolResultType, type ErrorResult, type OtherResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { ENTITY_METADATA, getEntitiesAlias } from '@kbn/entity-store/common';
import type { ExperimentalFeatures } from '../../../../common';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../__mocks__/test_helpers';
import { ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT } from '../../../lib/telemetry/event_based/events';
import { requireResolvedEntity } from './entity_resolution';
import {
  entityRelationshipHistoryTool,
  SECURITY_ENTITY_RELATIONSHIP_HISTORY_TOOL_ID,
} from './entity_relationship_history_tool';

jest.mock('../../utils/get_agent_builder_resource_availability', () => ({
  getAgentBuilderResourceAvailability: jest.fn(),
}));

jest.mock('./entity_resolution', () => ({
  ...jest.requireActual('./entity_resolution'),
  requireResolvedEntity: jest.fn(),
}));

const mockGetAgentBuilderResourceAvailability = getAgentBuilderResourceAvailability as jest.Mock;
const mockRequireResolvedEntity = requireResolvedEntity as jest.MockedFunction<
  typeof requireResolvedEntity
>;

const mockExperimentalFeatures = {
  entityAnalyticsEntityStoreV2: true,
} as ExperimentalFeatures;

const ENTITY_ID = 'user:alice@local';
const TARGET = 'host:laptopA';

const resolvedOk = {
  ok: true as const,
  identity: {
    identifierType: 'user' as const,
    identifier: 'alice@local',
    entityStoreId: ENTITY_ID,
  },
};

const resolvedTargetOk = {
  ok: true as const,
  identity: {
    identifierType: 'host' as const,
    identifier: 'laptopA',
    entityStoreId: TARGET,
  },
};

const sampleDoc = {
  '@timestamp': '2026-05-15T10:30:00.000Z',
  'event.kind': 'event' as const,
  'event.action': 'relationship_observed' as const,
  'entity.id': ENTITY_ID,
  'entity.source': 'elastic_defend',
  'entity.relationships.accesses_frequently.target': TARGET,
  Maintainer: {
    kind: 'accesses_frequently_and_infrequently',
    scan_id: 'scan-1',
    lookback_window: 'now-30d',
  },
};

describe('entityRelationshipHistoryTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = entityRelationshipHistoryTool(mockCore, mockLogger, mockExperimentalFeatures);

  let mockListRelationshipMetadata: jest.Mock;
  let mockCreateRelationshipsClient: jest.Mock;
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;
  let mockCheckPrivileges: jest.Mock;

  const handlerContext = () => createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

  const mockSecurity = {
    authz: {
      checkPrivilegesDynamicallyWithRequest: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockListRelationshipMetadata = jest.fn().mockResolvedValue({
      records: [],
      total: 0,
      page: 1,
      perPage: 50,
    });
    mockCreateRelationshipsClient = jest.fn().mockReturnValue({
      listRelationshipMetadata: mockListRelationshipMetadata,
    });
    mockRequireResolvedEntity.mockImplementation(async ({ entityId }) => {
      if (entityId === TARGET || entityId === 'laptopA') {
        return resolvedTargetOk;
      }
      return resolvedOk;
    });
    mockCheckPrivileges = jest.fn().mockResolvedValue({ hasAllRequested: true });
    mockSecurity.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(mockCheckPrivileges);

    mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient);
    mockGetAgentBuilderResourceAvailability.mockResolvedValue({ status: 'available' });
    mockEsClient.asInternalUser.indices.exists.mockResolvedValue(true);

    mockCore.getStartServices.mockResolvedValue([
      mockCoreStart,
      {
        entityStore: {
          createRelationshipsClient: mockCreateRelationshipsClient,
          createCRUDClient: jest.fn(),
          createEntityMetadataClient: jest.fn(),
          createResolutionClient: jest.fn(),
          getMaintainerStatus: jest.fn().mockResolvedValue([]),
        },
        security: mockSecurity,
      },
      {},
    ]);
  });

  describe('schema', () => {
    it('accepts entityId alone', () => {
      expect(tool.schema.safeParse({ entityId: ENTITY_ID }).success).toBe(true);
    });

    it('accepts full filter set with maxResults', () => {
      expect(
        tool.schema.safeParse({
          entityId: ENTITY_ID,
          entityType: 'user',
          kind: 'accesses_frequently',
          target: TARGET,
          targetType: 'host',
          from: 'now-30d',
          to: 'now',
          sortOrder: 'asc',
          maxResults: 1,
        }).success
      ).toBe(true);
    });

    it('accepts ISO from/to', () => {
      expect(
        tool.schema.safeParse({
          entityId: ENTITY_ID,
          from: '2026-05-01T00:00:00Z',
          to: '2026-05-29T23:59:59Z',
        }).success
      ).toBe(true);
    });

    it('rejects empty entityId', () => {
      expect(tool.schema.safeParse({ entityId: '' }).success).toBe(false);
    });

    it('rejects invalid kind', () => {
      expect(tool.schema.safeParse({ entityId: ENTITY_ID, kind: 'friends_with' }).success).toBe(
        false
      );
    });

    it('rejects empty or oversized from/to', () => {
      expect(tool.schema.safeParse({ entityId: ENTITY_ID, from: '' }).success).toBe(false);
      expect(tool.schema.safeParse({ entityId: ENTITY_ID, to: 'x'.repeat(101) }).success).toBe(
        false
      );
    });

    it('rejects maxResults outside 1–100', () => {
      expect(tool.schema.safeParse({ entityId: ENTITY_ID, maxResults: 0 }).success).toBe(false);
      expect(tool.schema.safeParse({ entityId: ENTITY_ID, maxResults: 101 }).success).toBe(false);
    });
  });

  describe('availability', () => {
    it('is unavailable when entity store v2 resources are unavailable', async () => {
      mockGetAgentBuilderResourceAvailability.mockResolvedValueOnce({
        status: 'unavailable',
        reason: 'no license',
      });
      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );
      expect(result).toEqual({ status: 'unavailable', reason: 'no license' });
    });

    it('is unavailable when the metadata alias does not exist', async () => {
      mockEsClient.asInternalUser.indices.exists.mockImplementation(async ({ index }) => {
        return index !== getEntitiesAlias(ENTITY_METADATA, 'default');
      });
      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );
      expect(result.status).toBe('unavailable');
      expect((result as { reason?: string }).reason).toContain('metadata');
    });

    it('is available when entity store v2 and metadata alias exist', async () => {
      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );
      expect(result).toEqual({ status: 'available' });
      expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
        index: getEntitiesAlias(ENTITY_METADATA, 'default'),
      });
    });
  });

  describe('handler', () => {
    it('returns empty records as a successful other result (not an error)', async () => {
      const result = (await tool.handler(
        { entityId: ENTITY_ID },
        handlerContext()
      )) as ToolHandlerStandardReturn;

      const other = result.results[0] as OtherResult;
      expect(other.type).toBe(ToolResultType.other);
      expect(other.data).toEqual({
        entityId: ENTITY_ID,
        total: 0,
        truncated: false,
        records: [],
      });
    });

    it('resolves the entity then queries relationship metadata with the canonical EUID', async () => {
      mockListRelationshipMetadata.mockResolvedValueOnce({
        records: [sampleDoc],
        total: 1,
        page: 1,
        perPage: 50,
      });

      const result = (await tool.handler(
        {
          entityId: ENTITY_ID,
          kind: 'accesses_frequently',
          target: 'laptopA',
          targetType: 'host',
        },
        handlerContext()
      )) as ToolHandlerStandardReturn;

      expect(mockRequireResolvedEntity).toHaveBeenCalledWith({
        esClient: mockEsClient.asCurrentUser,
        spaceId: 'default',
        entityId: ENTITY_ID,
        entityType: undefined,
      });
      expect(mockRequireResolvedEntity).toHaveBeenCalledWith({
        esClient: mockEsClient.asCurrentUser,
        spaceId: 'default',
        entityId: 'laptopA',
        entityType: 'host',
      });
      expect(mockListRelationshipMetadata).toHaveBeenCalledWith({
        entityId: ENTITY_ID,
        kind: 'accesses_frequently',
        target: TARGET,
        from: undefined,
        to: undefined,
        sortOrder: 'desc',
        perPage: 50,
        page: 1,
      });

      const other = result.results[0] as OtherResult;
      expect(other.data).toEqual({
        entityId: ENTITY_ID,
        target: TARGET,
        total: 1,
        truncated: false,
        records: [
          {
            kind: 'accesses_frequently',
            target: TARGET,
            timestamp: '2026-05-15T10:30:00.000Z',
            source: 'elastic_defend',
          },
        ],
      });
    });

    it('returns a permission error when the user cannot read the metadata index', async () => {
      mockCheckPrivileges.mockResolvedValueOnce({ hasAllRequested: false });

      const result = (await tool.handler(
        { entityId: ENTITY_ID },
        handlerContext()
      )) as ToolHandlerStandardReturn;

      const err = result.results[0] as ErrorResult;
      expect(err.type).toBe(ToolResultType.error);
      expect((err.data as { message: string }).message).toContain(
        'You do not have permission to read entity relationship history'
      );
      expect(mockRequireResolvedEntity).not.toHaveBeenCalled();
      expect(mockListRelationshipMetadata).not.toHaveBeenCalled();
    });

    it('returns not_found without querying relationship metadata', async () => {
      mockRequireResolvedEntity.mockResolvedValueOnce({
        ok: false,
        results: [
          {
            tool_result_id: 'err-1',
            type: ToolResultType.error,
            data: { message: 'No entity found for id: missing' },
          },
        ],
      });

      const result = (await tool.handler(
        { entityId: 'missing' },
        handlerContext()
      )) as ToolHandlerStandardReturn;

      const err = result.results[0] as ErrorResult;
      expect(err.type).toBe(ToolResultType.error);
      expect((err.data as { message: string }).message).toContain('No entity found');
      expect(mockListRelationshipMetadata).not.toHaveBeenCalled();
    });

    it('returns ambiguous candidates without querying relationship metadata', async () => {
      mockRequireResolvedEntity.mockResolvedValueOnce({
        ok: false,
        results: [
          {
            tool_result_id: 'amb-1',
            type: ToolResultType.other,
            data: {
              message: 'Multiple entities matched "Alice".',
              candidateEntityIds: ['user:alice@local', 'user:alice@corp'],
            },
          },
        ],
      });

      const result = (await tool.handler(
        { entityId: 'Alice' },
        handlerContext()
      )) as ToolHandlerStandardReturn;

      const other = result.results[0] as OtherResult;
      expect(other.type).toBe(ToolResultType.other);
      expect(other.data).toEqual(
        expect.objectContaining({
          candidateEntityIds: ['user:alice@local', 'user:alice@corp'],
        })
      );
      expect(mockListRelationshipMetadata).not.toHaveBeenCalled();
    });

    it('returns target not_found without querying relationship metadata', async () => {
      mockRequireResolvedEntity.mockImplementation(async ({ entityId }) => {
        if (entityId === ENTITY_ID) {
          return resolvedOk;
        }
        return {
          ok: false,
          results: [
            {
              tool_result_id: 'err-target',
              type: ToolResultType.error,
              data: { message: 'No entity found for id: ghost-host' },
            },
          ],
        };
      });

      const result = (await tool.handler(
        { entityId: ENTITY_ID, target: 'ghost-host' },
        handlerContext()
      )) as ToolHandlerStandardReturn;

      const err = result.results[0] as ErrorResult;
      expect(err.type).toBe(ToolResultType.error);
      expect((err.data as { message: string }).message).toContain('ghost-host');
      expect(mockListRelationshipMetadata).not.toHaveBeenCalled();
    });

    it('returns an error for unparseable from/to without querying relationship metadata', async () => {
      const result = (await tool.handler(
        { entityId: ENTITY_ID, from: 'yesterday' },
        handlerContext()
      )) as ToolHandlerStandardReturn;

      const err = result.results[0] as ErrorResult;
      expect(err.type).toBe(ToolResultType.error);
      expect((err.data as { message: string }).message).toContain('Unable to parse time range');
      expect(mockListRelationshipMetadata).not.toHaveBeenCalled();
    });

    it('sets truncated when total exceeds maxResults', async () => {
      mockListRelationshipMetadata.mockResolvedValueOnce({
        records: [sampleDoc],
        total: 12,
        page: 1,
        perPage: 1,
      });

      const result = (await tool.handler(
        { entityId: ENTITY_ID, maxResults: 1 },
        handlerContext()
      )) as ToolHandlerStandardReturn;

      const other = result.results[0] as OtherResult;
      expect(other.data).toEqual(
        expect.objectContaining({
          total: 12,
          truncated: true,
        })
      );
    });

    it('returns an error result when the client throws', async () => {
      mockListRelationshipMetadata.mockRejectedValueOnce(new Error('ES down'));

      const result = (await tool.handler(
        { entityId: ENTITY_ID },
        handlerContext()
      )) as ToolHandlerStandardReturn;

      const err = result.results[0] as ErrorResult;
      expect(err.type).toBe(ToolResultType.error);
      expect((err.data as { message: string }).message).toContain('ES down');
    });

    it('reports telemetry on success', async () => {
      mockListRelationshipMetadata.mockResolvedValueOnce({
        records: [sampleDoc],
        total: 1,
        page: 1,
        perPage: 50,
      });

      await tool.handler({ entityId: ENTITY_ID }, handlerContext());

      expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
        ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
        expect.objectContaining({
          toolId: SECURITY_ENTITY_RELATIONSHIP_HISTORY_TOOL_ID,
          actionType: 'read',
          success: true,
          resultCount: 1,
        })
      );
    });
  });
});
