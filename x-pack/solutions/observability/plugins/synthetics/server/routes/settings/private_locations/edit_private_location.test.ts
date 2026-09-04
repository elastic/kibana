/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { editPrivateLocationRoute } from './edit_private_location';
import { PrivateLocationRepository } from '../../../repositories/private_location_repository';
import { updatePrivateLocationMonitors } from './helpers';
import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';

jest.mock('../../../synthetics_service/get_private_locations', () => ({
  getPrivateLocations: jest.fn().mockResolvedValue([]),
  getPrivateLocationsForNamespaces: jest.fn().mockResolvedValue([]),
}));

// Privilege-check and sharding-sync wiring are under test here; the actual
// monitor rewrite is exercised by helpers.test.ts.
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

const makeRouteContext = (body: Record<string, unknown>, { hasEnterprise = false } = {}) => {
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
    context: {
      licensing: Promise.resolve({
        license: {
          isAvailable: true,
          isActive: true,
          hasAtLeast: (level: string) => level === 'enterprise' && hasEnterprise,
        },
      }),
    },
  } as any;
  return { routeContext, response };
};

describe('editPrivateLocationRoute isAgentSharding', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

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

  it('persists isAgentSharding when it is the only change and the license is Enterprise', async () => {
    const edit = stubRepo({ isAgentSharding: true });
    const { routeContext } = makeRouteContext({ isAgentSharding: true }, { hasEnterprise: true });

    const result = await editPrivateLocationRoute().handler(routeContext);

    expect(edit).toHaveBeenCalledWith('loc-1', expect.objectContaining({ isAgentSharding: true }));
    expect(result).toEqual(expect.objectContaining({ isAgentSharding: true }));
    expect(updatePrivateLocationMonitors).toHaveBeenCalledWith(
      expect.objectContaining({
        locationId: 'loc-1',
        newLocationLabel: 'Loc',
      })
    );
  });

  it('rejects enabling isAgentSharding without an Enterprise license', async () => {
    const edit = stubRepo();
    const { routeContext, response } = makeRouteContext({ isAgentSharding: true });
    response.forbidden.mockReturnValue({ statusCode: 403 } as any);

    const result = await editPrivateLocationRoute().handler(routeContext);

    expect(result).toEqual({ statusCode: 403 });
    expect(response.forbidden).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining('Enterprise license'),
        }),
      })
    );
    expect(edit).not.toHaveBeenCalled();
  });

  it('overwrites an enabled isAgentSharding flag with false', async () => {
    const edit = stubRepo({ isAgentSharding: false }, { isAgentSharding: true });
    const { routeContext } = makeRouteContext({ isAgentSharding: false });

    const result = await editPrivateLocationRoute().handler(routeContext);

    expect(edit).toHaveBeenCalledWith('loc-1', expect.objectContaining({ isAgentSharding: false }));
    expect(result).not.toHaveProperty('isAgentSharding');
    expect(updatePrivateLocationMonitors).toHaveBeenCalledWith(
      expect.objectContaining({
        locationId: 'loc-1',
        newLocationLabel: 'Loc',
      })
    );
  });

  it('does not write when the body omits isAgentSharding and other fields', async () => {
    const edit = stubRepo();
    const { routeContext } = makeRouteContext({});

    await editPrivateLocationRoute().handler(routeContext);

    expect(edit).not.toHaveBeenCalled();
    expect(updatePrivateLocationMonitors).not.toHaveBeenCalled();
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
      context: {
        licensing: Promise.resolve({
          license: { isAvailable: true, isActive: true, hasAtLeast: () => false },
        }),
      },
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

  it('returns forbidden when turning sharding off and a monitor belongs to an unauthorized space', async () => {
    const edit = stubRepo({ isAgentSharding: false }, { isAgentSharding: true });
    const { routeContext, response } = makeRouteContext({ isAgentSharding: false });
    const forbidden = { statusCode: 403 };
    response.forbidden.mockReturnValue(forbidden as any);
    routeContext.monitorConfigRepository.findDecryptedMonitors.mockResolvedValue([
      { namespaces: ['default', 'restricted-space'] },
    ]);
    routeContext.server.security = {
      authz: {
        checkSavedObjectsPrivilegesWithRequest: jest
          .fn()
          .mockReturnValue(jest.fn().mockResolvedValue({ hasAllRequested: false })),
      },
    };

    const result = await editPrivateLocationRoute().handler(routeContext);

    expect(result).toBe(forbidden);
    expect(edit).not.toHaveBeenCalled();
    expect(updatePrivateLocationMonitors).not.toHaveBeenCalled();
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

  it('rewrites monitors before persisting a sharding change so a failed rewrite leaves the flag unchanged', async () => {
    const edit = stubRepo({ isAgentSharding: true });
    const { routeContext } = makeRouteContext({ isAgentSharding: true }, { hasEnterprise: true });

    await editPrivateLocationRoute().handler(routeContext);

    expect(updatePrivateLocationMonitors).toHaveBeenCalled();
    expect(edit).toHaveBeenCalled();
    expect((updatePrivateLocationMonitors as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      edit.mock.invocationCallOrder[0]
    );
  });

  it('does not persist isAgentSharding when monitor rewrite throws', async () => {
    const edit = stubRepo({ isAgentSharding: true });
    (updatePrivateLocationMonitors as jest.Mock).mockRejectedValueOnce(new Error('fleet down'));
    const { routeContext } = makeRouteContext({ isAgentSharding: true }, { hasEnterprise: true });

    await expect(editPrivateLocationRoute().handler(routeContext)).rejects.toThrow('fleet down');
    expect(edit).not.toHaveBeenCalled();
  });

  it('passes the intended sharding flag to monitor rewrite before the saved object is persisted', async () => {
    (getPrivateLocations as jest.Mock).mockResolvedValue([
      { id: 'loc-1', label: 'Loc', agentPolicyId: 'ap-1', isServiceManaged: false },
      {
        id: 'loc-2',
        label: 'Other',
        agentPolicyId: 'ap-2',
        isServiceManaged: false,
        isAgentSharding: true,
      },
    ]);
    stubRepo({ isAgentSharding: true });
    const { routeContext } = makeRouteContext({ isAgentSharding: true }, { hasEnterprise: true });

    await editPrivateLocationRoute().handler(routeContext);

    expect(updatePrivateLocationMonitors).toHaveBeenCalledWith(
      expect.objectContaining({
        allPrivateLocations: [
          expect.objectContaining({ id: 'loc-1', isAgentSharding: true }),
          expect.objectContaining({ id: 'loc-2', isAgentSharding: true }),
        ],
      })
    );
  });

  it('clears isAgentSharding on the rewritten location before persisting a disable', async () => {
    (getPrivateLocations as jest.Mock).mockResolvedValue([
      {
        id: 'loc-1',
        label: 'Loc',
        agentPolicyId: 'ap-1',
        isServiceManaged: false,
        isAgentSharding: true,
      },
      {
        id: 'loc-2',
        label: 'Other',
        agentPolicyId: 'ap-2',
        isServiceManaged: false,
        isAgentSharding: true,
      },
    ]);
    stubRepo({ isAgentSharding: false }, { isAgentSharding: true });
    const { routeContext } = makeRouteContext({ isAgentSharding: false });

    await editPrivateLocationRoute().handler(routeContext);

    expect(updatePrivateLocationMonitors).toHaveBeenCalledWith(
      expect.objectContaining({
        allPrivateLocations: [
          expect.objectContaining({ id: 'loc-1', isAgentSharding: false }),
          expect.objectContaining({ id: 'loc-2', isAgentSharding: true }),
        ],
      })
    );
  });

  it('passes the new label to monitor rewrite before the saved object is persisted', async () => {
    (getPrivateLocations as jest.Mock).mockResolvedValue([
      { id: 'loc-1', label: 'Loc', agentPolicyId: 'ap-1', isServiceManaged: false },
      { id: 'loc-2', label: 'Other', agentPolicyId: 'ap-2', isServiceManaged: false },
    ]);
    stubRepo({ label: 'Barcelona' });
    const { routeContext } = makeRouteContext({ label: 'Barcelona' });

    await editPrivateLocationRoute().handler(routeContext);

    expect(updatePrivateLocationMonitors).toHaveBeenCalledWith(
      expect.objectContaining({
        newLocationLabel: 'Barcelona',
        allPrivateLocations: [
          expect.objectContaining({ id: 'loc-1', label: 'Barcelona' }),
          expect.objectContaining({ id: 'loc-2', label: 'Other' }),
        ],
      })
    );
  });
});
