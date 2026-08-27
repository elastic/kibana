/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { PND_API_PRIVILEGE_WRITE } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { WorkflowsManagedReadForbiddenError } from '../../services/watches/workflows_read_authz';
import { registerUpdateWatchRoute } from './update_watch';

const registerHandler = (useMockData = false) => {
  const router = httpServiceMock.createRouter();
  const addVersion = jest.fn();
  (router.versioned.patch as jest.Mock).mockReturnValue({ addVersion });
  const update = jest.fn();
  registerUpdateWatchRoute({
    router,
    logger: loggerMock.create(),
    config: { demo: { forceIncident: false }, enabled: true, ui: { useMockData } },
    getSpaceId: () => 'space-a',
    getWatchesService: () => ({ update } as never),
  } as unknown as RouteDependencies);
  return {
    handler: addVersion.mock.calls[0][1],
    security: (router.versioned.patch as jest.Mock).mock.calls[0][0].security,
    update,
  };
};

const createContext = () => ({
  core: Promise.resolve({}),
});

describe('update watch route', () => {
  it('requires Workflows managed-read on live updates so get-after-write can populate authzResult', () => {
    const { security } = registerHandler();

    expect(security).toEqual({
      authz: {
        requiredPrivileges: [
          PND_API_PRIVILEGE_WRITE,
          WorkflowsManagementApiActions.read,
          WorkflowsManagementApiActions.readManaged,
        ],
        extendedPrivileges: [
          WorkflowsManagementApiActions.readExecution,
          WorkflowsManagementApiActions.readManagedExecution,
        ],
      },
    });
  });

  it('keeps mock-mode updates on PND-write only', () => {
    const { security } = registerHandler(true);

    expect(security).toEqual({
      authz: { requiredPrivileges: [PND_API_PRIVILEGE_WRITE] },
    });
  });

  it.each([
    [{ outcome: 'conflict' }, 'conflict'],
    [{ outcome: 'rejected', what: 'an unsupported setting' }, 'badRequest'],
  ] as const)('maps %s to the expected response', async (result, responseMethod) => {
    const { handler, update } = registerHandler();
    update.mockResolvedValue(result);
    const request = httpServerMock.createKibanaRequest({
      params: { watchId: 'system-security-watch-floor' },
      body: { enabled: true },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(createContext(), request, response);

    expect(response[responseMethod]).toHaveBeenCalled();
  });

  it('maps a failed confirmation to 500', async () => {
    const { handler, update } = registerHandler();
    update.mockResolvedValue({ outcome: 'failed' });
    const request = httpServerMock.createKibanaRequest({
      params: { watchId: 'system-security-watch-floor' },
      body: { enabled: true },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(createContext(), request, response);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });

  it('maps a managed-read forbidden error to 403 rather than a retried 500', async () => {
    const { handler, update } = registerHandler();
    update.mockRejectedValue(new WorkflowsManagedReadForbiddenError());
    const request = httpServerMock.createKibanaRequest({
      params: { watchId: 'system-security-watch-floor' },
      body: { enabled: true },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(createContext(), request, response);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('refuses autonomyLevel so PATCH cannot bypass pnd_manage_autonomy', async () => {
    const { handler, update } = registerHandler();
    const request = httpServerMock.createKibanaRequest({
      params: { watchId: 'system-security-watch-floor' },
      body: { autonomyLevel: 'assisted', settingsRevision: null },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(createContext(), request, response);

    expect(response.badRequest).toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
