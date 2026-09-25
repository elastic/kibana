/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { editPrivateLocationRoute, EditPrivateLocationSchema } from './edit_private_location';
import { PrivateLocationRepository } from '../../../repositories/private_location_repository';
import { updatePrivateLocationMonitors } from './helpers';
import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';

jest.mock('../../../synthetics_service/get_private_locations', () => ({
  getPrivateLocations: jest.fn().mockResolvedValue([]),
  getPrivateLocationsForNamespaces: jest.fn().mockResolvedValue([]),
}));

// Privilege-check and label-sync wiring are under test here; the actual
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

describe('editPrivateLocationRoute', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  const stubRepo = (updatedAttributes = {}) => {
    jest
      .spyOn(PrivateLocationRepository.prototype, 'getPrivateLocation')
      .mockResolvedValue(existingLocation as any);
    return jest
      .spyOn(PrivateLocationRepository.prototype, 'editPrivateLocation')
      .mockResolvedValue({
        ...existingLocation,
        attributes: { ...existingLocation.attributes, ...updatedAttributes },
      } as any);
  };

  it('persists a tag-only edit without rewriting monitors', async () => {
    const edit = stubRepo({ tags: ['new'] });
    const { routeContext } = makeRouteContext({ tags: ['new'] });

    const result = await editPrivateLocationRoute().handler(routeContext);

    expect(edit).toHaveBeenCalledWith('loc-1', { label: 'Loc', tags: ['new'] });
    expect(updatePrivateLocationMonitors).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ tags: ['new'] }));
  });

  it('does not write when the body has no changes', async () => {
    const edit = stubRepo();
    const { routeContext } = makeRouteContext({});

    await editPrivateLocationRoute().handler(routeContext);

    expect(edit).not.toHaveBeenCalled();
    expect(updatePrivateLocationMonitors).not.toHaveBeenCalled();
  });

  it('ignores the deprecated isAgentSharding field without writing', async () => {
    const edit = stubRepo();
    const { routeContext } = makeRouteContext({ isAgentSharding: true });

    const result = await editPrivateLocationRoute().handler(routeContext);

    expect(edit).not.toHaveBeenCalled();
    expect(updatePrivateLocationMonitors).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty('isAgentSharding');
  });

  it('persists label and tags but not the deprecated isAgentSharding field', async () => {
    const edit = stubRepo({ tags: ['new'] });
    const { routeContext } = makeRouteContext({ tags: ['new'], isAgentSharding: false });

    await editPrivateLocationRoute().handler(routeContext);

    expect(edit).toHaveBeenCalledWith('loc-1', { label: 'Loc', tags: ['new'] });
  });

  it('returns forbidden when a monitor using the location belongs to an unauthorized space', async () => {
    const edit = stubRepo();
    const { routeContext, response } = makeRouteContext({ label: 'New label' });
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

  it('rewrites monitors before persisting a label change', async () => {
    const edit = stubRepo({ label: 'Barcelona' });
    const { routeContext } = makeRouteContext({ label: 'Barcelona' });

    await editPrivateLocationRoute().handler(routeContext);

    expect(updatePrivateLocationMonitors).toHaveBeenCalled();
    expect(edit).toHaveBeenCalled();
    expect((updatePrivateLocationMonitors as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      edit.mock.invocationCallOrder[0]
    );
  });

  it('does not persist the label when monitor rewrite throws', async () => {
    const edit = stubRepo({ label: 'Barcelona' });
    (updatePrivateLocationMonitors as jest.Mock).mockRejectedValueOnce(new Error('fleet down'));
    const { routeContext } = makeRouteContext({ label: 'Barcelona' });

    await expect(editPrivateLocationRoute().handler(routeContext)).rejects.toThrow('fleet down');
    expect(edit).not.toHaveBeenCalled();
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

describe('EditPrivateLocationSchema', () => {
  it('rejects unknown keys so a typo-only update cannot succeed as a no-op', () => {
    expect(EditPrivateLocationSchema.safeParse({ lable: 'x' }).success).toBe(false);
  });

  it('still accepts the deprecated isAgentSharding field', () => {
    expect(EditPrivateLocationSchema.safeParse({ isAgentSharding: true }).success).toBe(true);
  });

  it('accepts a known partial update', () => {
    expect(EditPrivateLocationSchema.parse({ label: 'x' })).toEqual({ label: 'x' });
  });
});
