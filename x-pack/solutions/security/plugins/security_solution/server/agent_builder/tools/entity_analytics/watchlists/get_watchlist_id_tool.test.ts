/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolTestMocks, setupMockCoreStartServices } from '../../../__mocks__/test_helpers';

const mockGetUserWatchlistPrivileges = jest.fn();
jest.mock(
  '../../../../lib/entity_analytics/watchlists/management/get_user_watchlist_privileges',
  () => ({
    getUserWatchlistPrivileges: (...args: unknown[]) => mockGetUserWatchlistPrivileges(...args),
  })
);

import { getWatchlistIdTool } from './get_watchlist_id_tool';
import type { ExperimentalFeatures } from '../../../../../common';

const soGet = jest.fn();
const soFind = jest.fn();

const { mockCore, mockEsClient } = createToolTestMocks();

const context = {
  logger: loggerMock.create(),
  spaceId: 'default',
  esClient: { asCurrentUser: {} },
  savedObjectsClient: { get: soGet, find: soFind },
  request: {},
} as never;

const runHandler = async (identifier: string): Promise<ToolHandlerStandardReturn> => {
  const tool = getWatchlistIdTool(mockCore, loggerMock.create(), {} as ExperimentalFeatures);
  return (await tool.handler({ identifier }, context)) as ToolHandlerStandardReturn;
};

const notFound = () => SavedObjectsErrorHelpers.createGenericNotFoundError('watchlist-config', 'x');

describe('getWatchlistIdTool', () => {
  beforeEach(() => {
    soGet.mockReset();
    soFind.mockReset();
    setupMockCoreStartServices(mockCore, mockEsClient);
    mockGetUserWatchlistPrivileges.mockReset();
    mockGetUserWatchlistPrivileges.mockResolvedValue({
      privileges: {},
      has_all_required: true,
      has_read_permissions: true,
      has_write_permissions: true,
    });
  });

  it('returns the id unchanged when the identifier is a real id (no name scan)', async () => {
    const watchlist = { id: 'wl-priv', name: 'Privileged Users' };
    soGet.mockResolvedValue({ id: watchlist.id, attributes: { name: watchlist.name } });

    const { results } = await runHandler('wl-priv');

    expect(soGet).toHaveBeenCalledWith('watchlist-config', watchlist.id);
    expect(soFind).not.toHaveBeenCalled();
    expect(results[0].type).toBe(ToolResultType.other);
    expect(results[0].data).toEqual({ watchlistId: watchlist.id, name: watchlist.name });
  });

  it('resolves a name to its id via an exact-match find when the identifier is not an id', async () => {
    const watchlist = { id: 'wl-priv', name: 'Privileged Users' };
    soGet.mockRejectedValue(notFound());
    soFind.mockResolvedValue({
      saved_objects: [{ id: watchlist.id, attributes: { name: watchlist.name } }],
    });

    const { results } = await runHandler(watchlist.name);

    expect(soFind).toHaveBeenCalled();
    expect(results[0].type).toBe(ToolResultType.other);
    expect(results[0].data).toEqual({ watchlistId: watchlist.id, name: watchlist.name });
  });

  it('errors when several watchlists share the exact name (ambiguous)', async () => {
    const watchlistName = 'Duplicated';
    soGet.mockRejectedValue(notFound());
    soFind.mockResolvedValue({
      saved_objects: [
        { id: 'wl-a', attributes: { name: watchlistName } },
        { id: 'wl-b', attributes: { name: watchlistName } },
      ],
    });

    const { results } = await runHandler(watchlistName);

    expect(results[0].type).toBe(ToolResultType.error);
  });

  it('returns an error result when the name matches nothing', async () => {
    soGet.mockRejectedValue(notFound());
    soFind.mockResolvedValue({ saved_objects: [] });

    const { results } = await runHandler('Nope');

    expect(results[0].type).toBe(ToolResultType.error);
  });

  it('denies access without touching saved objects when the user lacks read permission', async () => {
    mockGetUserWatchlistPrivileges.mockResolvedValue({
      privileges: {},
      has_all_required: false,
      has_read_permissions: false,
      has_write_permissions: false,
    });

    const { results } = await runHandler('wl-priv');

    expect(results[0].type).toBe(ToolResultType.error);
    expect(soGet).not.toHaveBeenCalled();
    expect(soFind).not.toHaveBeenCalled();
  });

  it('surfaces a non-404 lookup failure as an error result', async () => {
    soGet.mockRejectedValue(new Error('error'));

    const { results } = await runHandler('wl-priv');

    expect(results[0].type).toBe(ToolResultType.error);
    expect(soFind).not.toHaveBeenCalled();
  });
});
