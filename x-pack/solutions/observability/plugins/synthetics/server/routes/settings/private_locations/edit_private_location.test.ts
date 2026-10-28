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
import { runTaskPerPrivateLocation } from '../../../tasks/sync_private_locations_monitors_task';
import {
  getPrivateLocations,
  getPrivateLocationsForNamespaces,
} from '../../../synthetics_service/get_private_locations';

jest.mock('../../../tasks/sync_private_locations_monitors_task', () => ({
  runTaskPerPrivateLocation: jest.fn().mockResolvedValue(undefined),
}));

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
    request: { params: { id: 'loc-1' }, body },
    response,
    spaceId: 'default',
    savedObjectsClient: {},
    monitorConfigRepository: {
      findDecryptedMonitors: jest.fn().mockResolvedValue([]),
    },
    server: {
      coreStart: {
        savedObjects: { createInternalRepository: jest.fn().mockReturnValue({}) },
      },
      fleet: {
        agentPolicyService: {
          get: jest.fn().mockResolvedValue({ id: 'ap-2', space_ids: ['default'] }),
        },
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

describe('editPrivateLocationRoute agent policy change', () => {
  const monitors = [{ id: 'm-1', namespaces: ['default'] }];

  const setup = (body: Record<string, unknown> = { agentPolicyId: 'ap-2' }) => {
    jest
      .spyOn(PrivateLocationRepository.prototype, 'getPrivateLocation')
      .mockResolvedValue(existingLocation as any);
    const edit = jest
      .spyOn(PrivateLocationRepository.prototype, 'editPrivateLocation')
      .mockResolvedValue({
        ...existingLocation,
        attributes: { ...existingLocation.attributes, agentPolicyId: 'ap-2' },
      } as any);
    (getPrivateLocations as jest.Mock).mockResolvedValue([
      { id: 'loc-1', label: 'Loc', agentPolicyId: 'ap-1', isServiceManaged: false },
    ]);
    (getPrivateLocationsForNamespaces as jest.Mock).mockResolvedValue([]);
    const { routeContext, response } = makeRouteContext(body);
    routeContext.monitorConfigRepository.findDecryptedMonitors.mockResolvedValue(monitors);
    routeContext.server.security = {
      authz: {
        checkSavedObjectsPrivilegesWithRequest: jest
          .fn()
          .mockReturnValue(jest.fn().mockResolvedValue({ hasAllRequested: true })),
      },
    };
    response.badRequest.mockImplementation((options: any) => ({ status: 400, ...options }));
    response.customError.mockImplementation((options: any) => options);
    return { edit, routeContext, response };
  };

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('persists the new agent policy, then schedules the monitors to move to it', async () => {
    const { edit, routeContext } = setup();

    await editPrivateLocationRoute().handler(routeContext);

    expect(edit).toHaveBeenCalledWith('loc-1', {
      label: 'Loc',
      tags: ['t'],
      agentPolicyId: 'ap-2',
    });
    expect(runTaskPerPrivateLocation).toHaveBeenCalledWith({
      server: routeContext.server,
      privateLocationId: 'loc-1',
      previousAgentPolicyId: 'ap-1',
    });
    expect(edit.mock.invocationCallOrder[0]).toBeLessThan(
      (runTaskPerPrivateLocation as jest.Mock).mock.invocationCallOrder[0]
    );
    expect(updatePrivateLocationMonitors).not.toHaveBeenCalled();
  });

  it('reverts the agent policy and rethrows when scheduling the move fails', async () => {
    const { edit, routeContext } = setup();
    (runTaskPerPrivateLocation as jest.Mock).mockRejectedValueOnce(new Error('tm down'));

    await expect(editPrivateLocationRoute().handler(routeContext)).rejects.toThrow('tm down');

    // A retry would otherwise see no change and never schedule the move.
    expect(edit).toHaveBeenCalledTimes(2);
    expect(edit).toHaveBeenLastCalledWith('loc-1', {
      label: 'Loc',
      tags: ['t'],
      agentPolicyId: 'ap-1',
    });
  });

  it('does not schedule a move for a tag-only edit', async () => {
    const { routeContext } = setup({ tags: ['new'] });

    await editPrivateLocationRoute().handler(routeContext);

    expect(runTaskPerPrivateLocation).not.toHaveBeenCalled();
  });

  it('rejects an agent policy that is not available in the current space', async () => {
    const { edit, routeContext } = setup();
    routeContext.server.fleet.agentPolicyService.get.mockRejectedValue(new Error('not found'));

    const result = await editPrivateLocationRoute().handler(routeContext);

    expect(result).toEqual(expect.objectContaining({ status: 400 }));
    expect(runTaskPerPrivateLocation).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it('rejects an agent policy that does not cover the location spaces', async () => {
    const { edit, routeContext } = setup();
    routeContext.server.fleet.agentPolicyService.get.mockResolvedValue({
      id: 'ap-2',
      space_ids: ['other-space'],
    });

    const result = await editPrivateLocationRoute().handler(routeContext);

    expect(result).toEqual(expect.objectContaining({ status: 400 }));
    expect(runTaskPerPrivateLocation).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it('rejects an agent policy already used by another private location', async () => {
    const { edit, routeContext } = setup();
    (getPrivateLocationsForNamespaces as jest.Mock).mockResolvedValue([
      { id: 'loc-1', label: 'Loc', agentPolicyId: 'ap-1', isServiceManaged: false },
      { id: 'loc-2', label: 'Secret label', agentPolicyId: 'ap-2', isServiceManaged: false },
    ]);

    const result = await editPrivateLocationRoute().handler(routeContext);

    expect(result).toEqual(expect.objectContaining({ status: 400 }));
    expect(JSON.stringify(result)).not.toContain('Secret label');
    expect(getPrivateLocationsForNamespaces).toHaveBeenCalledWith(
      expect.anything(),
      existingLocation.namespaces
    );
    expect(runTaskPerPrivateLocation).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it('rewrites the monitor label before persisting when label and agent policy change together', async () => {
    const { edit, routeContext } = setup({ label: 'Barcelona', agentPolicyId: 'ap-2' });

    await editPrivateLocationRoute().handler(routeContext);

    expect(updatePrivateLocationMonitors).toHaveBeenCalledWith(
      expect.objectContaining({
        locationId: 'loc-1',
        newLocationLabel: 'Barcelona',
        monitorsInLocation: monitors,
        allPrivateLocations: [
          expect.objectContaining({ label: 'Barcelona', agentPolicyId: 'ap-1' }),
        ],
      })
    );
    expect((updatePrivateLocationMonitors as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      edit.mock.invocationCallOrder[0]
    );
    expect(runTaskPerPrivateLocation).toHaveBeenCalledTimes(1);
  });

  it('does not schedule a move or persist when the monitor label rewrite throws', async () => {
    const { edit, routeContext } = setup({ label: 'Barcelona', agentPolicyId: 'ap-2' });
    (updatePrivateLocationMonitors as jest.Mock).mockRejectedValueOnce(new Error('fleet down'));

    await expect(editPrivateLocationRoute().handler(routeContext)).rejects.toThrow('fleet down');
    expect(runTaskPerPrivateLocation).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it('skips scheduling the move when no monitors use the location', async () => {
    const { edit, routeContext } = setup();
    routeContext.monitorConfigRepository.findDecryptedMonitors.mockResolvedValue([]);

    await editPrivateLocationRoute().handler(routeContext);

    expect(runTaskPerPrivateLocation).not.toHaveBeenCalled();
    expect(edit).toHaveBeenCalledWith('loc-1', expect.objectContaining({ agentPolicyId: 'ap-2' }));
  });
});

describe('EditPrivateLocationSchema', () => {
  it('rejects unknown keys so a typo-only update cannot succeed as a no-op', () => {
    expect(EditPrivateLocationSchema.safeParse({ lable: 'x' }).success).toBe(false);
  });

  it('accepts a known partial update', () => {
    expect(EditPrivateLocationSchema.parse({ label: 'x' })).toEqual({ label: 'x' });
  });

  it('accepts an agent policy change and rejects an empty agent policy id', () => {
    expect(EditPrivateLocationSchema.safeParse({ agentPolicyId: 'ap-2' }).success).toBe(true);
    expect(EditPrivateLocationSchema.safeParse({ agentPolicyId: '' }).success).toBe(false);
  });
});
