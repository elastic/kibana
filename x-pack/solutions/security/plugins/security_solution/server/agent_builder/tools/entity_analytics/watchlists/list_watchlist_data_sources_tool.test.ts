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
import { getWatchlistToolAvailability } from './watchlist_availability';
import {
  listWatchlistDataSourcesTool,
  SECURITY_LIST_WATCHLIST_DATA_SOURCES_TOOL_ID,
} from './list_watchlist_data_sources_tool';

jest.mock('./watchlist_availability', () => ({
  getWatchlistToolAvailability: jest.fn(),
}));

const mockGetWatchlistToolAvailability = getWatchlistToolAvailability as jest.Mock;

const mockExperimentalFeatures = {
  entityAnalyticsWatchlistEnabled: true,
  entityAnalyticsEntityStoreV2: true,
} as ExperimentalFeatures;

const mockGetWatchlistFn = jest.fn();
const mockGetEntitySourceIdsFn = jest.fn().mockResolvedValue([]);
jest.mock('../../../../lib/entity_analytics/watchlists/management/watchlist_config', () => {
  const actual = jest.requireActual(
    '../../../../lib/entity_analytics/watchlists/management/watchlist_config'
  );
  return {
    ...actual,
    WatchlistConfigClient: jest.fn().mockImplementation(() => ({
      get: mockGetWatchlistFn,
      getEntitySourceIds: mockGetEntitySourceIdsFn,
    })),
  };
});

const mockListFn = jest.fn().mockResolvedValue({ sources: [] });
jest.mock('../../../../lib/entity_analytics/watchlists/entity_sources/infra', () => {
  const actual = jest.requireActual(
    '../../../../lib/entity_analytics/watchlists/entity_sources/infra'
  );
  return {
    ...actual,
    WatchlistEntitySourceClient: jest.fn().mockImplementation(() => ({
      list: mockListFn,
    })),
  };
});

const mockGetUserWatchlistPrivileges = jest.fn();
jest.mock(
  '../../../../lib/entity_analytics/watchlists/management/get_user_watchlist_privileges',
  () => ({
    getUserWatchlistPrivileges: (...args: unknown[]) => mockGetUserWatchlistPrivileges(...args),
  })
);

interface ListResultData {
  watchlistId: string;
  watchlistName: string;
  dataSources: Array<Record<string, unknown>>;
}

const buildWatchlist = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'wl-1',
  name: 'Privileged Users',
  managed: false,
  entitySourceIds: [],
  ...overrides,
});

describe('listWatchlistDataSourcesTool', () => {
  const mocks = createToolTestMocks();
  const tool = listWatchlistDataSourcesTool(
    mocks.mockCore,
    mocks.mockLogger,
    mockExperimentalFeatures,
    true
  );
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart = setupMockCoreStartServices(mocks.mockCore, mocks.mockEsClient);
    mockGetWatchlistToolAvailability.mockResolvedValue({ status: 'available' });
    mockGetUserWatchlistPrivileges.mockResolvedValue({
      privileges: {},
      has_all_required: true,
      has_read_permissions: true,
      has_write_permissions: true,
    });
    mockGetEntitySourceIdsFn.mockResolvedValue([]);
    mockListFn.mockResolvedValue({ sources: [] });
  });

  describe('availability', () => {
    it('is available when the AB resource check passes and both flags are on', async () => {
      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mocks.mockRequest, 'default')
      );
      expect(result.status).toBe('available');
    });
  });

  describe('schema', () => {
    it('accepts a valid watchlistId', () => {
      expect(tool.schema.safeParse({ watchlistId: 'wl-1' }).success).toBe(true);
    });

    it('rejects an empty watchlistId', () => {
      expect(tool.schema.safeParse({ watchlistId: '' }).success).toBe(false);
    });
  });

  describe('handler', () => {
    it('returns an error when the caller lacks read privilege', async () => {
      mockGetUserWatchlistPrivileges.mockResolvedValueOnce({
        privileges: {},
        has_all_required: false,
        has_read_permissions: false,
        has_write_permissions: false,
      });
      const ctx = createToolHandlerContext(mocks.mockRequest, mocks.mockEsClient, mocks.mockLogger);

      const result = (await tool.handler(
        { watchlistId: 'wl-1' },
        ctx
      )) as ToolHandlerStandardReturn;

      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toMatch(/permission/i);
    });

    it('returns all linked sources, including managed integration sources', async () => {
      mockGetWatchlistFn.mockResolvedValueOnce(
        buildWatchlist({ name: 'Privileged Users', entitySourceIds: ['src-1', 'src-2'] })
      );
      mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1', 'src-2']);
      mockListFn.mockResolvedValueOnce({
        sources: [
          {
            id: 'src-1',
            type: 'store',
            name: 'wl-store',
            managed: false,
            enabled: true,
            queryRule: 'host.os.name: "Ubuntu*"',
          },
          {
            id: 'src-2',
            type: 'entity_analytics_integration',
            name: 'okta-source',
            managed: true,
            enabled: true,
            integrationName: 'entityanalytics_okta',
          },
        ],
      });
      const ctx = createToolHandlerContext(mocks.mockRequest, mocks.mockEsClient, mocks.mockLogger);

      const result = (await tool.handler(
        { watchlistId: 'wl-1' },
        ctx
      )) as ToolHandlerStandardReturn;

      const other = result.results[0] as OtherResult<ListResultData>;
      expect(other.type).toBe(ToolResultType.other);
      expect(other.data.watchlistName).toBe('Privileged Users');
      expect(other.data.dataSources).toHaveLength(2);
      expect(other.data.dataSources[0]).toMatchObject({
        id: 'src-1',
        type: 'store',
        queryRule: 'host.os.name: "Ubuntu*"',
      });
      expect(other.data.dataSources[1]).toMatchObject({
        id: 'src-2',
        type: 'entity_analytics_integration',
        managed: true,
      });
    });

    it('reports hasApiKey: false for an index source with no api key', async () => {
      mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ entitySourceIds: ['src-1'] }));
      mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
      mockListFn.mockResolvedValueOnce({
        sources: [
          {
            id: 'src-1',
            type: 'index',
            name: 'wl-index',
            managed: false,
            indexPattern: 'logs-okta*',
            identifierField: 'user.name',
            apiKeyId: null,
          },
        ],
      });
      const ctx = createToolHandlerContext(mocks.mockRequest, mocks.mockEsClient, mocks.mockLogger);

      const result = (await tool.handler(
        { watchlistId: 'wl-1' },
        ctx
      )) as ToolHandlerStandardReturn;

      const other = result.results[0] as OtherResult<ListResultData>;
      expect(other.data.dataSources[0]).toMatchObject({
        hasApiKey: false,
      });
    });

    it('returns an empty list without calling the entity source client when there are no linked sources', async () => {
      mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
      const ctx = createToolHandlerContext(mocks.mockRequest, mocks.mockEsClient, mocks.mockLogger);

      const result = (await tool.handler(
        { watchlistId: 'wl-1' },
        ctx
      )) as ToolHandlerStandardReturn;

      const other = result.results[0] as OtherResult<ListResultData>;
      expect(mockListFn).not.toHaveBeenCalled();
      expect(other.data.dataSources).toEqual([]);
    });

    describe('telemetry', () => {
      it('reports success=true and resultCount matching the number of sources', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ entitySourceIds: ['src-1'] }));
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
        mockListFn.mockResolvedValueOnce({
          sources: [{ id: 'src-1', type: 'store', name: 'wl-store', managed: false }],
        });
        const ctx = createToolHandlerContext(
          mocks.mockRequest,
          mocks.mockEsClient,
          mocks.mockLogger
        );

        await tool.handler({ watchlistId: 'wl-1' }, ctx);

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_LIST_WATCHLIST_DATA_SOURCES_TOOL_ID,
            actionType: 'read',
            spaceId: 'default',
            success: true,
            resultCount: 1,
            errorMessage: undefined,
            userConfirmationOutcome: undefined,
          }
        );
      });
    });
  });
});
