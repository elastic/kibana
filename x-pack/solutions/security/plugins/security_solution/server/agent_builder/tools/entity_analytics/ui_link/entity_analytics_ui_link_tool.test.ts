/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';

const mockGet = jest.fn();
const mockList = jest.fn();
jest.mock('../../../../lib/entity_analytics/watchlists/management/watchlist_config', () => ({
  WatchlistConfigClient: jest.fn().mockImplementation(() => ({ get: mockGet, list: mockList })),
}));

const mockGetUserWatchlistPrivileges = jest.fn();
jest.mock(
  '../../../../lib/entity_analytics/watchlists/management/get_user_watchlist_privileges',
  () => ({
    getUserWatchlistPrivileges: (...args: unknown[]) => mockGetUserWatchlistPrivileges(...args),
  })
);

import {
  entityAnalyticsUiLinkTool,
  entityAnalyticsUiLinkSchema,
} from './entity_analytics_ui_link_tool';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';

const core = {
  getStartServices: jest
    .fn()
    .mockResolvedValue([{ http: { basePath: { serverBasePath: '/kbn' } } }, {}]),
} as unknown as SecuritySolutionPluginCoreSetupDependencies;

const handlerContext = {
  logger: loggerMock.create(),
  spaceId: 'my-space',
  esClient: { asCurrentUser: {} },
  savedObjectsClient: {},
  request: {},
} as never;

const runHandler = async (
  args: Parameters<ReturnType<typeof entityAnalyticsUiLinkTool>['handler']>[0]
): Promise<ToolHandlerStandardReturn> => {
  const tool = entityAnalyticsUiLinkTool(core);
  // The handler always returns the standard (results) shape, never the prompt variant.
  return (await tool.handler(args, handlerContext)) as ToolHandlerStandardReturn;
};

const urlOf = async (
  args: Parameters<ReturnType<typeof entityAnalyticsUiLinkTool>['handler']>[0]
) => {
  const { results } = await runHandler(args);
  return (results[0].data as { url: string }).url;
};

beforeEach(() => {
  mockGet.mockReset();
  mockList.mockReset();
  mockGetUserWatchlistPrivileges.mockReset();
  mockGetUserWatchlistPrivileges.mockResolvedValue({
    privileges: {},
    has_all_required: true,
    has_read_permissions: true,
    has_write_permissions: true,
  });
});

describe('entityAnalyticsUiLinkTool', () => {
  it('returns an error result when entity_resolution is missing entityId', async () => {
    const { results } = await runHandler({ intent: 'entity_resolution', entityType: 'host' });
    expect(results[0].type).toBe(ToolResultType.error);
    expect((results[0].data as { message: string }).message).toContain('entityId');
  });

  describe('watchlist_edit resolution', () => {
    const WATCHLISTS = [
      { id: 'wl-priv', name: 'Privileged Users' },
      { id: 'wl-comp', name: 'Compromised Accounts' },
    ];

    // `client.get(id)` throws when the id doesn't exist (mirrors WatchlistConfigClient).
    const getNotFound = () => mockGet.mockRejectedValue(new Error('not found'));

    it('uses a direct get when the reference is a real id (no list scan)', async () => {
      mockGet.mockResolvedValue({ id: 'wl-comp' });
      const url = await urlOf({ intent: 'watchlist_edit', watchlist: 'wl-comp' });
      expect(mockGet).toHaveBeenCalledWith('wl-comp');
      expect(mockList).not.toHaveBeenCalled();
      expect(decodeURIComponent(url)).toContain('wl-comp');
    });

    it('falls back to a name scan when the reference is not a known id', async () => {
      getNotFound();
      mockList.mockResolvedValue(WATCHLISTS);
      const url = await urlOf({ intent: 'watchlist_edit', watchlist: 'Privileged Users' });
      expect(mockGet).toHaveBeenCalledWith('Privileged Users');
      expect(mockList).toHaveBeenCalled();
      // The flyout must carry the resolved id (wl-priv), not the name.
      const flyout = new URLSearchParams(url.split('?')[1]).get('flyout') ?? '';
      expect(decodeURIComponent(flyout)).toContain('wl-priv');
      expect(decodeURIComponent(flyout)).not.toContain('Privileged Users');
    });

    it('errors when the reference matches neither an id nor a name', async () => {
      getNotFound();
      mockList.mockResolvedValue(WATCHLISTS);
      const { results } = await runHandler({ intent: 'watchlist_edit', watchlist: 'Nope' });
      expect(results[0].type).toBe(ToolResultType.error);
      expect((results[0].data as { message: string }).message).toContain('No watchlist found');
    });

    it('errors when watchlist is missing (no lookups attempted)', async () => {
      const { results } = await runHandler({ intent: 'watchlist_edit' });
      expect(results[0].type).toBe(ToolResultType.error);
      expect((results[0].data as { message: string }).message).toContain('watchlist');
      expect(mockGet).not.toHaveBeenCalled();
      expect(mockList).not.toHaveBeenCalled();
    });

    it('surfaces a name-scan lookup failure as an error result', async () => {
      getNotFound();
      mockList.mockRejectedValue(new Error('boom'));
      const { results } = await runHandler({
        intent: 'watchlist_edit',
        watchlist: 'Privileged Users',
      });
      expect(results[0].type).toBe(ToolResultType.error);
      expect((results[0].data as { message: string }).message).toContain('boom');
    });

    it('errors with a permission message and skips lookups when the user lacks read access', async () => {
      mockGetUserWatchlistPrivileges.mockResolvedValue({
        privileges: {},
        has_all_required: false,
        has_read_permissions: false,
        has_write_permissions: false,
      });
      const { results } = await runHandler({
        intent: 'watchlist_edit',
        watchlist: 'wl-comp',
      });
      expect(results[0].type).toBe(ToolResultType.error);
      expect(mockGet).not.toHaveBeenCalled();
      expect(mockList).not.toHaveBeenCalled();
    });
  });
});

describe('entityAnalyticsUiLinkSchema', () => {
  it('accepts each intent (conditional params are validated in the handler, not the schema)', () => {
    expect(
      entityAnalyticsUiLinkSchema.safeParse({ intent: 'entity_analytics_settings' }).success
    ).toBe(true);
    expect(entityAnalyticsUiLinkSchema.safeParse({ intent: 'risk_engine_settings' }).success).toBe(
      true
    );
    expect(
      entityAnalyticsUiLinkSchema.safeParse({ intent: 'entity_resolution_bulk' }).success
    ).toBe(true);
    expect(entityAnalyticsUiLinkSchema.safeParse({ intent: 'engine_status' }).success).toBe(true);
    expect(entityAnalyticsUiLinkSchema.safeParse({ intent: 'watchlists_list' }).success).toBe(true);
    expect(
      entityAnalyticsUiLinkSchema.safeParse({ intent: 'watchlist_edit', watchlist: 'X' }).success
    ).toBe(true);
    expect(
      entityAnalyticsUiLinkSchema.safeParse({
        intent: 'entity_resolution',
        entityType: 'user',
        entityName: 'jsmith',
        entityId: 'user:jsmith123',
      }).success
    ).toBe(true);
  });

  it('rejects an unknown intent', () => {
    expect(entityAnalyticsUiLinkSchema.safeParse({ intent: 'delete_everything' }).success).toBe(
      false
    );
  });

  it('rejects an invalid entityType (e.g. generic)', () => {
    expect(
      entityAnalyticsUiLinkSchema.safeParse({
        intent: 'entity_resolution',
        entityType: 'generic',
        entityName: 'x',
        entityId: 'x',
      }).success
    ).toBe(false);
  });
});
