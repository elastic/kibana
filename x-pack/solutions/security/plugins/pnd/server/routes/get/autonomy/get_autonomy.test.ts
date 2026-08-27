/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { PND_AUTONOMY_URL, SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';
import { PND_API_PRIVILEGE_READ } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { registerGetAutonomyRoute } from './get_autonomy';

const createDeps = () => {
  const router = mockRouter.create();
  const get = jest.fn().mockResolvedValue({
    settings: { autonomy: 'assisted', watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID },
    settingsRevision: null,
  });
  const deps = {
    config: { enabled: true, ui: { useMockData: false } },
    getSpaceId: jest.fn().mockReturnValue('agent-3'),
    getWatchesService: jest.fn().mockReturnValue({ get }),
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & { router: ReturnType<typeof mockRouter.create> };

  return { deps, get };
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
  it('registers the route gated on only the low read privilege', () => {
    const { deps } = createDeps();

    registerGetAutonomyRoute(deps);

    expect(deps.router.versioned.getRoute('get', PND_AUTONOMY_URL).config.security).toEqual({
      authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
    });
  });

  it('returns the autonomy response for a managed watch', async () => {
    const { deps } = createDeps();
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

  it('reads template values for the request space without installing', async () => {
    const { deps, get } = createDeps();
    registerGetAutonomyRoute(deps);

    await invoke(getHandler(deps.router), { watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID });

    expect(deps.getWatchesService).toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith(SYSTEM_SECURITY_WATCH_FLOOR_ID, 'agent-3', expect.any(Object));
  });

  it('returns the default manual level when the watch is not installed', async () => {
    const { deps, get } = createDeps();
    get.mockResolvedValue({ settings: { autonomy: 'manual' }, settingsRevision: null });
    registerGetAutonomyRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ autonomyLevel: 'manual' }),
      })
    );
  });

  it('rejects an unknown watch id with a 400 (security finding S4)', async () => {
    const { deps, get } = createDeps();
    registerGetAutonomyRoute(deps);

    const response = await invoke(getHandler(deps.router), { watchId: '../../evil' });

    expect(response.badRequest).toHaveBeenCalledTimes(1);
    expect(get).not.toHaveBeenCalled();
  });

  it('returns a 500 when reading settings throws', async () => {
    const { deps, get } = createDeps();
    get.mockRejectedValue(new Error('boom'));
    registerGetAutonomyRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
