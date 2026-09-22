/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { deletePrivateLocationRoute } from './delete_private_location';
import { MonitorConfigRepository } from '../../../services/monitor_config_repository';
import { privateLocationSavedObjectName } from '../../../../common/saved_objects/private_locations';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';
import { migrateLegacyPrivateLocations } from './migrate_legacy_private_locations';

jest.mock('./get_private_locations');
jest.mock('./migrate_legacy_private_locations');

const locationId = 'test-location-id';

const emptyFindResponse = { total: 0, saved_objects: [], page: 1, per_page: 0 };

const setup = ({ crossSpaceMonitorTotal }: { crossSpaceMonitorTotal: number }) => {
  (migrateLegacyPrivateLocations as jest.Mock).mockResolvedValue(undefined);
  (getPrivateLocationsAndAgentPolicies as jest.Mock).mockResolvedValue({
    locations: [{ id: locationId }],
  });

  // Internal (unscoped) repository sees monitors in every space.
  const internalSOClient = {
    find: jest.fn().mockResolvedValue({ ...emptyFindResponse, total: crossSpaceMonitorTotal }),
  };
  // Request-scoped client is bound to the caller's space; it must NOT be used for the count.
  const savedObjectsClient = {
    find: jest.fn().mockResolvedValue(emptyFindResponse),
    delete: jest.fn().mockResolvedValue({}),
  } as unknown as SavedObjectsClientContract;

  const monitorConfigRepository = new MonitorConfigRepository(savedObjectsClient, {} as never);

  const response = {
    badRequest: jest.fn((arg) => ({ status: 400, ...arg })),
  };

  const routeContext = {
    savedObjectsClient,
    syntheticsMonitorClient: {},
    request: { params: { locationId } },
    response,
    monitorConfigRepository,
    server: {
      logger: { debug: jest.fn(), error: jest.fn() },
      coreStart: {
        savedObjects: { createInternalRepository: jest.fn().mockReturnValue(internalSOClient) },
      },
    },
  } as any;

  return { routeContext, internalSOClient, savedObjectsClient, response };
};

describe('deletePrivateLocationRoute', () => {
  beforeEach(() => jest.clearAllMocks());

  it('counts monitors across all spaces via the internal repository', async () => {
    const { routeContext, internalSOClient, savedObjectsClient } = setup({
      crossSpaceMonitorTotal: 0,
    });

    await deletePrivateLocationRoute().handler(routeContext);

    expect(internalSOClient.find).toHaveBeenCalledWith(
      expect.objectContaining({ namespaces: [ALL_SPACES_ID] })
    );
    // The space-scoped client must not be used to decide whether the location is in use.
    expect(savedObjectsClient.find).not.toHaveBeenCalled();
    expect(savedObjectsClient.delete).toHaveBeenCalledWith(
      privateLocationSavedObjectName,
      locationId,
      { force: true }
    );
  });

  it('blocks deletion when a monitor in a non-accessible space still uses the location', async () => {
    const { routeContext, savedObjectsClient, response } = setup({ crossSpaceMonitorTotal: 1 });

    await deletePrivateLocationRoute().handler(routeContext);

    expect(savedObjectsClient.delete).not.toHaveBeenCalled();
    expect(response.badRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining('cannot be deleted because it is used'),
        }),
      })
    );
  });
});
