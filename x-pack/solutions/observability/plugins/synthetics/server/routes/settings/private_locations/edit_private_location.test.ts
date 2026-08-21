/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { editPrivateLocationRoute } from './edit_private_location';
import { PrivateLocationRepository } from '../../../repositories/private_location_repository';

jest.mock('../../../synthetics_service/get_private_locations', () => ({
  getPrivateLocations: jest.fn().mockResolvedValue([]),
  getPrivateLocationsForNamespaces: jest.fn().mockResolvedValue([]),
}));

// Only the privilege-check path (assertions below) is under test here; the
// actual monitor-label sync is exercised by helpers.test.ts.
jest.mock('./helpers', () => {
  const actual = jest.requireActual('./helpers');
  return {
    ...actual,
    updatePrivateLocationMonitors: jest.fn().mockResolvedValue(undefined),
  };
});

const existingLocation = {
  id: 'loc-1',
  namespaces: ['default'],
  attributes: {
    label: 'Loc',
    id: 'loc-1',
    agentPolicyId: 'ap-1',
    isServiceManaged: false,
    tags: ['t'],
  },
};

const makeRouteContext = (body: Record<string, unknown>) => {
  const response = httpServerMock.createResponseFactory();
  const routeContext = {
    request: { params: { locationId: 'loc-1' }, body },
    response,
    savedObjectsClient: {},
    monitorConfigRepository: {
      findDecryptedMonitors: jest.fn().mockResolvedValue([]),
    },
    server: {
      coreStart: {
        savedObjects: { createInternalRepository: jest.fn().mockReturnValue({}) },
      },
    },
  } as any;
  return { routeContext, response };
};

describe('editPrivateLocationRoute isAgentSharding', () => {
  afterEach(() => jest.restoreAllMocks());

  const stubRepo = (updatedAttributes = {}, existingAttributes = {}) => {
    const location = {
      ...existingLocation,
      attributes: { ...existingLocation.attributes, ...existingAttributes },
    };
    jest
      .spyOn(PrivateLocationRepository.prototype, 'getPrivateLocation')
      .mockResolvedValue(location as any);
    return jest
      .spyOn(PrivateLocationRepository.prototype, 'editPrivateLocation')
      .mockResolvedValue({
        ...location,
        attributes: { ...location.attributes, ...updatedAttributes },
      } as any);
  };

  it('persists isAgentSharding when it is the only change', async () => {
    const edit = stubRepo({ isAgentSharding: true });
    const { routeContext } = makeRouteContext({ isAgentSharding: true });

    const result = await editPrivateLocationRoute().handler(routeContext);

    expect(edit).toHaveBeenCalledWith('loc-1', expect.objectContaining({ isAgentSharding: true }));
    expect(result).toEqual(expect.objectContaining({ isAgentSharding: true }));
  });

  it('overwrites an enabled isAgentSharding flag with false', async () => {
    const edit = stubRepo({ isAgentSharding: false }, { isAgentSharding: true });
    const { routeContext } = makeRouteContext({ isAgentSharding: false });

    const result = await editPrivateLocationRoute().handler(routeContext);

    expect(edit).toHaveBeenCalledWith('loc-1', expect.objectContaining({ isAgentSharding: false }));
    expect(result).not.toHaveProperty('isAgentSharding');
  });

  it('does not write when the body omits isAgentSharding and other fields', async () => {
    const edit = stubRepo();
    const { routeContext } = makeRouteContext({});

    await editPrivateLocationRoute().handler(routeContext);

    expect(edit).not.toHaveBeenCalled();
  });

  it('returns forbidden when a monitor using the location belongs to an unauthorized space', async () => {
    const response = httpServerMock.createResponseFactory();
    const forbidden = { statusCode: 403 };
    response.forbidden.mockReturnValue(forbidden as any);
    const edit = jest.spyOn(PrivateLocationRepository.prototype, 'editPrivateLocation');
    jest.spyOn(PrivateLocationRepository.prototype, 'getPrivateLocation').mockResolvedValue({
      id: 'location-1',
      namespaces: ['default'],
      attributes: {
        id: 'location-1',
        label: 'Old label',
        agentPolicyId: 'agent-policy-1',
        isServiceManaged: false,
      },
    } as any);

    const result = await editPrivateLocationRoute().handler({
      request: { params: { locationId: 'location-1' }, body: { label: 'New label' } },
      response,
      savedObjectsClient: {},
      monitorConfigRepository: {
        findDecryptedMonitors: jest
          .fn()
          .mockResolvedValue([{ namespaces: ['default', 'restricted-space'] }]),
      },
      server: {
        coreStart: {
          savedObjects: { createInternalRepository: jest.fn().mockReturnValue({}) },
        },
        security: {
          authz: {
            checkSavedObjectsPrivilegesWithRequest: jest
              .fn()
              .mockReturnValue(jest.fn().mockResolvedValue({ hasAllRequested: false })),
          },
        },
      },
    } as any);

    expect(result).toBe(forbidden);
    expect(edit).not.toHaveBeenCalled();
  });

  it('checks privileges across every monitor namespace, deduped, not just the first', async () => {
    const edit = stubRepo({ label: 'New label' });
    const { routeContext } = makeRouteContext({ label: 'New label' });
    routeContext.monitorConfigRepository.findDecryptedMonitors.mockResolvedValue([
      { namespaces: ['space-a'] },
      { namespaces: ['space-b', 'space-a'] },
    ]);
    const checkSavedObjectsPrivileges = jest.fn().mockResolvedValue({ hasAllRequested: true });
    routeContext.server.security = {
      authz: {
        checkSavedObjectsPrivilegesWithRequest: jest
          .fn()
          .mockReturnValue(checkSavedObjectsPrivileges),
      },
    };

    await editPrivateLocationRoute().handler(routeContext);

    expect(checkSavedObjectsPrivileges).toHaveBeenCalled();
    const [, spacesArg] = checkSavedObjectsPrivileges.mock.calls[0];
    expect(spacesArg).toEqual(expect.arrayContaining(['space-a', 'space-b']));
    // deduped: 'space-a' appears in both monitors but must only be checked once
    expect(spacesArg).toHaveLength(2);
    expect(edit).toHaveBeenCalled();
  });
});
