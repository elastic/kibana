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
import { PND_API_PRIVILEGE_READ } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { getScopedInternalUiSettingsClient } from '../../../lib/scoped_internal_ui_settings_client';
import { registerGetAutonomyRoute } from './get_autonomy';

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
  router.versioned.getRoute('get', PND_AUTONOMY_URL).versions['1'].handler;

const invoke = async (handler: ReturnType<typeof getHandler>, query: { watchId: string }) => {
  const request = httpServerMock.createKibanaRequest({ query });
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

describe('registerGetAutonomyRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getScopedInternalUiSettingsClientMock.mockReturnValue({
      get: jest.fn().mockResolvedValue('assisted'),
      set: jest.fn(),
    });
  });

  it('registers the route gated on only the low read privilege', () => {
    const deps = createDeps();

    registerGetAutonomyRoute(deps);

    expect(deps.router.versioned.getRoute('get', PND_AUTONOMY_URL).config.security).toEqual({
      authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
    });
  });

  it('returns the autonomy response for a managed watch', async () => {
    const deps = createDeps();
    registerGetAutonomyRoute(deps);

    const response = await invoke(getHandler(deps.router), {
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

  it('reads the setting keyed by the watch id', async () => {
    const deps = createDeps();
    const uiSettingsClient = { get: jest.fn().mockResolvedValue('assisted'), set: jest.fn() };
    getScopedInternalUiSettingsClientMock.mockReturnValue(uiSettingsClient);
    registerGetAutonomyRoute(deps);

    await invoke(getHandler(deps.router), { watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID });

    expect(uiSettingsClient.get).toHaveBeenCalledWith(
      buildWatchAutonomyUiSettingKey(SYSTEM_SECURITY_WATCH_FLOOR_ID)
    );
  });

  it('scopes the read to the space resolved from the request', async () => {
    const deps = createDeps();
    registerGetAutonomyRoute(deps);

    await invoke(getHandler(deps.router), { watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID });

    expect(getScopedInternalUiSettingsClientMock).toHaveBeenCalledWith({
      savedObjects,
      spaceId: 'agent-3',
      uiSettings,
    });
  });

  it('rejects an unknown watch id with a 400 (security finding S4)', async () => {
    const deps = createDeps();
    registerGetAutonomyRoute(deps);

    const response = await invoke(getHandler(deps.router), { watchId: '../../evil' });

    expect(response.badRequest).toHaveBeenCalledTimes(1);
  });

  it('does not build a settings client for an unknown watch id', async () => {
    const deps = createDeps();
    registerGetAutonomyRoute(deps);

    await invoke(getHandler(deps.router), { watchId: '../../evil' });

    expect(getScopedInternalUiSettingsClientMock).not.toHaveBeenCalled();
  });

  it('returns a 500 when reading the setting throws', async () => {
    const deps = createDeps();
    getScopedInternalUiSettingsClientMock.mockReturnValue({
      get: jest.fn().mockRejectedValue(new Error('boom')),
      set: jest.fn(),
    });
    registerGetAutonomyRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
