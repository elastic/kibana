/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { PND_WATCHES_URL } from '@kbn/pnd-common';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { WorkflowsManagedReadForbiddenError } from '../../services/watches/workflows_read_authz';
import { registerListWatchesRoute } from './list_watches';
import { getWatchRouteAuthz } from './watch_route_security';

const createDeps = ({
  list = jest.fn().mockResolvedValue({ watches: [] }),
  useMockData = false,
}: {
  list?: jest.Mock;
  useMockData?: boolean;
} = {}) => {
  const router = mockRouter.create();
  const deps = {
    config: { enabled: true, ui: { useMockData } },
    getSpaceId: jest.fn().mockReturnValue('default'),
    getWatchesService: jest.fn().mockReturnValue({ list }),
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & { router: ReturnType<typeof mockRouter.create> };

  return { deps, list };
};

const getHandler = (router: ReturnType<typeof mockRouter.create>) =>
  router.versioned.getRoute('get', PND_WATCHES_URL).versions['1'].handler;

const invoke = async (handler: ReturnType<typeof getHandler>) => {
  const request = httpServerMock.createKibanaRequest();
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

describe('registerListWatchesRoute', () => {
  it('declares live Workflows managed-read so authzResult can authorize the catalog projection', () => {
    const { deps } = createDeps();

    registerListWatchesRoute(deps);

    expect(deps.router.versioned.getRoute('get', PND_WATCHES_URL).config.security).toEqual({
      authz: getWatchRouteAuthz(false),
    });
  });

  it('keeps mock-mode list on PND-read only', () => {
    const { deps } = createDeps({ useMockData: true });

    registerListWatchesRoute(deps);

    expect(deps.router.versioned.getRoute('get', PND_WATCHES_URL).config.security).toEqual({
      authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
    });
  });

  it('does not AND execution privileges into requiredPrivileges', () => {
    const { deps } = createDeps();

    registerListWatchesRoute(deps);

    const authz = deps.router.versioned.getRoute('get', PND_WATCHES_URL).config.security?.authz;
    const required = authz != null && 'requiredPrivileges' in authz ? authz.requiredPrivileges : [];

    expect(required).not.toContain(WorkflowsManagementApiActions.readExecution);
    expect(required).not.toContain(WorkflowsManagementApiActions.readManagedExecution);
  });

  it('maps a managed-read forbidden error to 403 rather than a retried 500', async () => {
    const { deps, list } = createDeps();
    list.mockRejectedValue(new WorkflowsManagedReadForbiddenError());
    registerListWatchesRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('maps an unexpected failure to 500', async () => {
    const { deps, list } = createDeps();
    list.mockRejectedValue(new Error('boom'));
    registerListWatchesRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
