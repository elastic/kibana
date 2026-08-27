/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { PND_WATCH_URL_TEMPLATE, SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { WorkflowsManagedReadForbiddenError } from '../../services/watches/workflows_read_authz';
import { registerGetWatchRoute } from './get_watch';
import { getWatchRouteAuthz } from './watch_route_security';

const createDeps = ({
  get = jest.fn().mockResolvedValue({ watch: { id: SYSTEM_SECURITY_WATCH_FLOOR_ID } }),
  useMockData = false,
}: {
  get?: jest.Mock;
  useMockData?: boolean;
} = {}) => {
  const router = mockRouter.create();
  const deps = {
    config: { enabled: true, ui: { useMockData } },
    getSpaceId: jest.fn().mockReturnValue('default'),
    getWatchesService: jest.fn().mockReturnValue({ get }),
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & { router: ReturnType<typeof mockRouter.create> };

  return { deps, get };
};

const getHandler = (router: ReturnType<typeof mockRouter.create>) =>
  router.versioned.getRoute('get', PND_WATCH_URL_TEMPLATE).versions['1'].handler;

const invoke = async (handler: ReturnType<typeof getHandler>) => {
  const request = httpServerMock.createKibanaRequest({
    params: { watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID },
  });
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

describe('registerGetWatchRoute', () => {
  it('declares live Workflows managed-read so authzResult can authorize the catalog projection', () => {
    const { deps } = createDeps();

    registerGetWatchRoute(deps);

    expect(deps.router.versioned.getRoute('get', PND_WATCH_URL_TEMPLATE).config.security).toEqual({
      authz: getWatchRouteAuthz(false),
    });
  });

  it('keeps mock-mode get on PND-read only', () => {
    const { deps } = createDeps({ useMockData: true });

    registerGetWatchRoute(deps);

    expect(deps.router.versioned.getRoute('get', PND_WATCH_URL_TEMPLATE).config.security).toEqual({
      authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
    });
  });

  it('maps a managed-read forbidden error to 403 rather than a retried 500', async () => {
    const { deps, get } = createDeps();
    get.mockRejectedValue(new WorkflowsManagedReadForbiddenError());
    registerGetWatchRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('maps an unexpected failure to 500', async () => {
    const { deps, get } = createDeps();
    get.mockRejectedValue(new Error('boom'));
    registerGetWatchRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
