/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  PND_AUTONOMY_URL,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  buildWatchAutonomyUiSettingKey,
} from '@kbn/pnd-common';
import { PND_API_PRIVILEGE_AUTONOMY_WRITE } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { getScopedInternalUiSettingsClient } from '../../../lib/scoped_internal_ui_settings_client';
import { registerPutAutonomyRoute } from './put_autonomy';

jest.mock('../../../lib/scoped_internal_ui_settings_client');

const getScopedInternalUiSettingsClientMock = getScopedInternalUiSettingsClient as jest.Mock;

const savedObjects = { id: 'savedObjects' };
const uiSettings = { id: 'uiSettings' };

const createDeps = () => {
  const router = mockRouter.create();
  const deps = {
    config: { enabled: true, ui: { useMockData: false } },
    getSpaceId: jest.fn().mockReturnValue('agent-3'),
    getStartServices: jest.fn().mockResolvedValue([{ savedObjects, uiSettings }, {}, {}]),
    getWatchProjection: jest.fn(),
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & { router: ReturnType<typeof mockRouter.create> };

  return deps;
};

const getHandler = (router: ReturnType<typeof mockRouter.create>) =>
  router.versioned.getRoute('put', PND_AUTONOMY_URL).versions['1'].handler;

const invoke = async (
  handler: ReturnType<typeof getHandler>,
  body: { watchId: string; autonomyLevel: unknown }
) => {
  const request = httpServerMock.createKibanaRequest({ body });
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

describe('registerPutAutonomyRoute', () => {
  let uiSettingsClient: { get: jest.Mock; set: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    uiSettingsClient = { get: jest.fn(), set: jest.fn().mockResolvedValue(undefined) };
    getScopedInternalUiSettingsClientMock.mockReturnValue(uiSettingsClient);
  });

  it('registers the route gated on the dedicated autonomy-write privilege', () => {
    const deps = createDeps();

    registerPutAutonomyRoute(deps);

    expect(deps.router.versioned.getRoute('put', PND_AUTONOMY_URL).config.security).toEqual({
      authz: { requiredPrivileges: [PND_API_PRIVILEGE_AUTONOMY_WRITE] },
    });
  });

  it('persists the level to the setting keyed by the watch id', async () => {
    const deps = createDeps();
    registerPutAutonomyRoute(deps);

    await invoke(getHandler(deps.router), {
      autonomyLevel: 'assisted',
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect(uiSettingsClient.set).toHaveBeenCalledWith(
      buildWatchAutonomyUiSettingKey(SYSTEM_SECURITY_WATCH_FLOOR_ID),
      'assisted'
    );
  });

  it('scopes the write to the space resolved from the request', async () => {
    const deps = createDeps();
    registerPutAutonomyRoute(deps);

    await invoke(getHandler(deps.router), {
      autonomyLevel: 'assisted',
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect(getScopedInternalUiSettingsClientMock).toHaveBeenCalledWith({
      savedObjects,
      spaceId: 'agent-3',
      uiSettings,
    });
  });

  it('returns the autonomy response after a successful write', async () => {
    const deps = createDeps();
    registerPutAutonomyRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      autonomyLevel: 'assisted',
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        autoAccept: {
          incident_contained: false,
          open_investigation: true,
          promote_incident: false,
        },
        autonomyLevel: 'assisted',
        watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
      },
    });
  });

  it('rejects a watchId outside the managed set with a 400 (security finding S4)', async () => {
    const deps = createDeps();
    registerPutAutonomyRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      autonomyLevel: 'assisted',
      watchId: '../../evil',
    });

    expect(response.badRequest).toHaveBeenCalledTimes(1);
  });

  it('does not write when the watchId is outside the managed set', async () => {
    const deps = createDeps();
    registerPutAutonomyRoute(deps);

    await invoke(getHandler(deps.router), { autonomyLevel: 'assisted', watchId: '../../evil' });

    expect(getScopedInternalUiSettingsClientMock).not.toHaveBeenCalled();
  });

  // The zod body already rejects a non-member, so these cover the S4 re-validation that runs
  // before the settings key is built — including the legacy ordinals a caller might still send.
  it.each(['autonomous', 'Supervised', 1, 3, 2.5, null])(
    'rejects the level %p with a 400',
    async (autonomyLevel) => {
      const deps = createDeps();
      registerPutAutonomyRoute(deps);

      const response = await invoke(getHandler(deps.router), {
        autonomyLevel,
        watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
      });

      expect(response.badRequest).toHaveBeenCalledTimes(1);
    }
  );

  it('does not write when the level is outside the shared scale', async () => {
    const deps = createDeps();
    registerPutAutonomyRoute(deps);

    await invoke(getHandler(deps.router), {
      autonomyLevel: 'autonomous',
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect(getScopedInternalUiSettingsClientMock).not.toHaveBeenCalled();
  });

  it('returns a 500 when the write throws', async () => {
    const deps = createDeps();
    uiSettingsClient.set.mockRejectedValue(new Error('boom'));
    registerPutAutonomyRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      autonomyLevel: 'assisted',
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
