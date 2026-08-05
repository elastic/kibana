/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { coreMock } from '@kbn/core/server/mocks';
import { ToolResultType, type ErrorResult, type OtherResult } from '@kbn/agent-builder-common';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import type { ExperimentalFeatures } from '../../../../../common';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../../__mocks__/test_helpers';
import { ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT } from '../../../../lib/telemetry/event_based/events';
import { RiskScoreDataClient } from '../../../../lib/entity_analytics/risk_score/risk_score_data_client';
import { getAgentBuilderResourceAvailability } from '../../../utils/get_agent_builder_resource_availability';
import {
  getEntityRiskScoreHistoryTool,
  SECURITY_GET_ENTITY_RISK_SCORE_HISTORY_TOOL_ID,
} from './get_entity_risk_score_history_tool';

jest.mock('../../../../lib/entity_analytics/risk_score/risk_score_data_client');
jest.mock('../../../utils/get_agent_builder_resource_availability', () => ({
  getAgentBuilderResourceAvailability: jest.fn(),
}));
jest.mock('@kbn/agent-builder-genai-utils', () => ({
  executeEsql: jest.fn(),
}));

const MockRiskScoreDataClient = RiskScoreDataClient as jest.MockedClass<typeof RiskScoreDataClient>;
const mockGetAgentBuilderResourceAvailability = getAgentBuilderResourceAvailability as jest.Mock;
const mockExecuteEsql = executeEsql as jest.Mock;

const mockExperimentalFeatures = {
  riskScoreHistoryEnabled: true,
  entityAnalyticsEntityStoreV2: true,
} as unknown as ExperimentalFeatures;

const HISTORY_ENTRIES = [
  {
    '@timestamp': '2026-05-01T00:00:00.000Z',
    calculated_score_norm: 40,
    calculated_level: 'Low' as const,
    calculated_score: 80,
    score_type: 'base' as const,
  },
  {
    '@timestamp': '2026-05-15T00:00:00.000Z',
    calculated_score_norm: 72,
    calculated_level: 'High' as const,
    calculated_score: 144,
    score_type: 'base' as const,
    inputs: [{ id: 'alert-1', risk_score: 50, contribution_score: 50, category: 'category_1' }],
  },
];

const exactHostHit = {
  columns: [
    { name: 'entity.id', type: 'keyword' },
    { name: 'entity.name', type: 'keyword' },
    { name: 'entity.EngineMetadata.Type', type: 'keyword' },
  ],
  values: [['host:server1', 'server1', 'host']],
};

const exactUserHit = {
  columns: [
    { name: 'entity.id', type: 'keyword' },
    { name: 'entity.name', type: 'keyword' },
    { name: 'entity.EngineMetadata.Type', type: 'keyword' },
  ],
  values: [['user:alice', 'alice', 'user']],
};

describe('getEntityRiskScoreHistoryTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = getEntityRiskScoreHistoryTool(
    mockCore,
    mockLogger,
    mockExperimentalFeatures,
    '9.5.0'
  );

  let mockGetRiskScoreHistory: jest.Mock;
  let mockCheckPrivileges: jest.Mock;
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;
  let mockAttachmentsAdd: jest.Mock;
  let mockAttachmentsUpdate: jest.Mock;
  let mockGetAttachmentRecord: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient);
    mockGetAgentBuilderResourceAvailability.mockResolvedValue({ status: 'available' });
    mockExecuteEsql.mockResolvedValue(exactHostHit);

    mockGetRiskScoreHistory = jest.fn().mockResolvedValue(HISTORY_ENTRIES);
    MockRiskScoreDataClient.mockImplementation(
      () =>
        ({
          getRiskScoreHistory: mockGetRiskScoreHistory,
        } as unknown as RiskScoreDataClient)
    );

    mockCheckPrivileges = jest.fn().mockResolvedValue({ hasAllRequested: true });
    const mockSecurity = {
      authz: {
        actions: { api: { get: (priv: string) => `api:${priv}` } },
        checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(mockCheckPrivileges),
      },
    };

    mockCore.getStartServices.mockResolvedValue([
      mockCoreStart,
      {
        security: mockSecurity,
        entityStore: { createCRUDClient: jest.fn() },
        licensing: {
          getLicense: jest.fn().mockResolvedValue({ hasAtLeast: () => true }),
        },
      },
      {},
    ]);

    mockAttachmentsAdd = jest.fn().mockResolvedValue({
      id: `security.riskhistory:host:abc`,
      current_version: 1,
    });
    mockAttachmentsUpdate = jest.fn();
    mockGetAttachmentRecord = jest.fn().mockReturnValue(undefined);
  });

  const runHandler = async (params: Record<string, unknown>) => {
    const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
      attachments: {
        add: mockAttachmentsAdd,
        update: mockAttachmentsUpdate,
        getAttachmentRecord: mockGetAttachmentRecord,
      } as never,
      savedObjectsClient: {} as never,
    });
    return tool.handler(params as never, context);
  };

  describe('schema', () => {
    it('accepts entityType + entityId', () => {
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

    it('accepts from/to date-math ranges', () => {
      expect(
        tool.schema.safeParse({
          entityType: 'user',
          entityId: 'alice',
          from: 'now-30d',
          to: 'now',
        }).success
      ).toBe(true);
      expect(
        tool.schema.safeParse({
          entityType: 'host',
          entityId: 'host:server1',
          from: '2026-01-01',
          to: '2026-03-15',
        }).success
      ).toBe(true);
    });

    it('accepts scoreType base or resolution', () => {
      expect(
        tool.schema.safeParse({
          entityType: 'host',
          entityId: 'host:server1',
          scoreType: 'resolution',
        }).success
      ).toBe(true);
    });

    it('accepts includeContributions', () => {
      expect(
        tool.schema.safeParse({
          entityType: 'host',
          entityId: 'host:server1',
          includeContributions: true,
        }).success
      ).toBe(true);
    });
  });

  describe('availability', () => {
    const runAvailability = (experimentalFeatures: Partial<ExperimentalFeatures> = {}) => {
      const availabilityTool = getEntityRiskScoreHistoryTool(
        mockCore,
        mockLogger,
        {
          riskScoreHistoryEnabled: true,
          entityAnalyticsEntityStoreV2: true,
          ...experimentalFeatures,
        } as unknown as ExperimentalFeatures,
        '9.5.0'
      );

      return availabilityTool.availability!.handler!({
        request: mockRequest,
        spaceId: 'default',
      } as never);
    };

    const mockLicensing = (hasAtLeast: boolean) => {
      mockCore.getStartServices.mockResolvedValue([
        mockCoreStart,
        {
          security: {},
          licensing: {
            getLicense: jest.fn().mockResolvedValue({ hasAtLeast: () => hasAtLeast }),
          },
        },
        {},
      ]);
    };

    it('is unavailable when riskScoreHistoryEnabled is false', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(true);

      await expect(runAvailability({ riskScoreHistoryEnabled: false })).resolves.toEqual({
        status: 'unavailable',
        reason: 'Risk score history is not enabled.',
      });
    });

    it('is unavailable when Entity Store V2 is off', async () => {
      await expect(runAvailability({ entityAnalyticsEntityStoreV2: false })).resolves.toEqual({
        status: 'unavailable',
        reason: 'Entity Store V2 is not enabled.',
      });
    });

    it('is unavailable when the entity store v2 index does not exist', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(false);

      await expect(runAvailability()).resolves.toEqual({
        status: 'unavailable',
        reason: 'Entity Store V2 index does not exist for this space',
      });
    });

    it('is unavailable without platinum license', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(true);
      mockLicensing(false);

      await expect(runAvailability()).resolves.toEqual({
        status: 'unavailable',
        reason: 'This tool requires a platinum license or above.',
      });
    });

    it('propagates space unavailability', async () => {
      mockGetAgentBuilderResourceAvailability.mockResolvedValue({
        status: 'unavailable',
        reason: 'wrong space',
      });

      await expect(runAvailability()).resolves.toEqual({
        status: 'unavailable',
        reason: 'wrong space',
      });
    });

    it('is available when FF, V2 index, and platinum license are satisfied', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(true);
      mockLicensing(true);

      await expect(runAvailability()).resolves.toEqual({ status: 'available' });
      expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
        index: 'entities-latest-default',
      });
    });
  });

  describe('handler', () => {
    it('returns history entries and a renderTag attachment', async () => {
      const result = (await runHandler({
        entityType: 'host',
        entityId: 'host:server1',
        from: 'now-90d',
      })) as ToolHandlerStandardReturn;

      const other = result.results.find((r) => r.type === ToolResultType.other) as OtherResult;
      expect(other.data).toEqual(
        expect.objectContaining({
          entityId: 'host:server1',
          entityType: 'host',
          from: 'now-90d',
          to: 'now',
          bucketInterval: '1d',
          includeContributions: false,
          entries: HISTORY_ENTRIES,
          renderTag: expect.stringMatching(/^<render_attachment id=".+" version="1" \/>$/),
        })
      );

      expect(mockGetRiskScoreHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'host',
          entityId: 'host:server1',
          range: { gte: 'now-90d', lte: 'now' },
          scoreType: 'base',
          includeContributions: false,
          // Simple chat heuristic (no uiSettings/TimeBuckets) → daily for 90d.
          interval: { value: 1, unit: 'd' },
        })
      );

      expect(mockAttachmentsAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SecurityAgentBuilderAttachments.entityRiskScoreHistory,
          data: expect.objectContaining({
            entityStoreId: 'host:server1',
            identifier: 'server1',
          }),
        })
      );
      const attachmentData = mockAttachmentsAdd.mock.calls[0][0].data;
      expect(attachmentData.entries).toHaveLength(2);
      expect(attachmentData.entries[1]).not.toHaveProperty('inputs');
    });

    it('resolves a bare entity name before fetching history', async () => {
      mockExecuteEsql
        .mockResolvedValueOnce({ columns: [], values: [] }) // exact id miss
        .mockResolvedValueOnce(exactHostHit); // exact name hit

      const result = (await runHandler({
        entityId: 'server1',
      })) as ToolHandlerStandardReturn;

      const other = result.results.find((r) => r.type === ToolResultType.other) as OtherResult;
      expect(other.data).toEqual(
        expect.objectContaining({
          entityId: 'host:server1',
          entityType: 'host',
          renderTag: expect.any(String),
        })
      );
      expect(mockGetRiskScoreHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'host',
          entityId: 'host:server1',
        })
      );
    });

    it('passes includeContributions through to the data client', async () => {
      await runHandler({
        entityType: 'host',
        entityId: 'host:server1',
        includeContributions: true,
      });

      expect(mockGetRiskScoreHistory).toHaveBeenCalledWith(
        expect.objectContaining({ includeContributions: true })
      );
    });

    it('passes scoreType resolution through to the data client', async () => {
      mockExecuteEsql.mockResolvedValueOnce(exactUserHit);

      await runHandler({
        entityType: 'user',
        entityId: 'user:alice',
        scoreType: 'resolution',
      });

      expect(mockGetRiskScoreHistory).toHaveBeenCalledWith(
        expect.objectContaining({ scoreType: 'resolution' })
      );
    });

    it('returns an error when no entity matches', async () => {
      mockExecuteEsql.mockResolvedValue({ columns: [], values: [] });

      const result = (await runHandler({
        entityId: 'missing-host',
      })) as ToolHandlerStandardReturn;

      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('No entity found');
      expect(mockGetRiskScoreHistory).not.toHaveBeenCalled();
      expect(mockAttachmentsAdd).not.toHaveBeenCalled();
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

      const result = (await runHandler({
        entityId: 'server',
      })) as ToolHandlerStandardReturn;

      expect(mockGetRiskScoreHistory).not.toHaveBeenCalled();
      expect(mockAttachmentsAdd).not.toHaveBeenCalled();

      const other = result.results[0] as OtherResult<{
        message: string;
        candidateEntityIds: string[];
      }>;
      expect(other.type).toBe(ToolResultType.other);
      expect(other.data.message).toContain('Multiple entities matched');
      expect(other.data.candidateEntityIds).toEqual(['host:server1', 'host:server10']);
      expect(other.data).not.toHaveProperty('renderTag');
    });

    it('returns an error when the user lacks entity-analytics privileges', async () => {
      mockCheckPrivileges.mockResolvedValueOnce({ hasAllRequested: false });

      const result = (await runHandler({
        entityType: 'host',
        entityId: 'host:server1',
      })) as ToolHandlerStandardReturn;

      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('permission');
      expect(mockExecuteEsql).not.toHaveBeenCalled();
      expect(mockGetRiskScoreHistory).not.toHaveBeenCalled();
    });

    it('reports telemetry usage', async () => {
      await runHandler({ entityType: 'host', entityId: 'host:server1' });

      expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
        ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
        expect.objectContaining({
          toolId: SECURITY_GET_ENTITY_RISK_SCORE_HISTORY_TOOL_ID,
        })
      );
    });
  });
});
