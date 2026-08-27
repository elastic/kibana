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
import { PND_API_PRIVILEGE_AUTONOMY_WRITE } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { registerPutAutonomyRoute } from './put_autonomy';

const createDeps = () => {
  const router = mockRouter.create();
  const get = jest.fn().mockResolvedValue({
    settings: { autonomy: 'manual', watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID },
    settingsRevision: null,
  });
  const update = jest.fn().mockResolvedValue({ outcome: 'updated' });
  const deps = {
    config: { enabled: true, ui: { useMockData: false } },
    getSpaceId: jest.fn().mockReturnValue('agent-3'),
    getWatchesService: jest.fn().mockReturnValue({ get, update }),
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & { router: ReturnType<typeof mockRouter.create> };

  return { deps, get, update };
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
  it('registers the route gated on the dedicated autonomy-write privilege', () => {
    const { deps } = createDeps();

    registerPutAutonomyRoute(deps);

    expect(deps.router.versioned.getRoute('put', PND_AUTONOMY_URL).config.security).toEqual({
      authz: { requiredPrivileges: [PND_API_PRIVILEGE_AUTONOMY_WRITE] },
    });
  });

  it('persists the level as a per-space template value without enabling', async () => {
    const { deps, update } = createDeps();
    registerPutAutonomyRoute(deps);

    await invoke(getHandler(deps.router), {
      autonomyLevel: 'assisted',
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect(update).toHaveBeenCalledWith(
      SYSTEM_SECURITY_WATCH_FLOOR_ID,
      { autonomyLevel: 'assisted', settingsRevision: null },
      'agent-3',
      expect.any(Object)
    );
  });

  it('returns the autonomy response after a successful write', async () => {
    const { deps } = createDeps();
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
    const { deps, update } = createDeps();
    registerPutAutonomyRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      autonomyLevel: 'assisted',
      watchId: '../../evil',
    });

    expect(response.badRequest).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
  });

  it.each(['autonomous', 'Supervised', 1, 3, 2.5, null])(
    'rejects the level %p with a 400',
    async (autonomyLevel) => {
      const { deps, update } = createDeps();
      registerPutAutonomyRoute(deps);

      const response = await invoke(getHandler(deps.router), {
        autonomyLevel,
        watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
      });

      expect(response.badRequest).toHaveBeenCalledTimes(1);
      expect(update).not.toHaveBeenCalled();
    }
  );

  it('returns a 500 when the write throws', async () => {
    const { deps, update } = createDeps();
    update.mockRejectedValue(new Error('boom'));
    registerPutAutonomyRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      autonomyLevel: 'assisted',
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
