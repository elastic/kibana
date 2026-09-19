/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID } from '@kbn/alertzero-common';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import { ALERTZERO_API_PRIVILEGE_WRITE } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { registerUpdateWorkerRoute } from './update_worker';

const TRIAGE = SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;

const managedUpdateAuthzResult = Object.fromEntries(
  WorkflowsManagementOperationPrivileges.updateManaged.map((privilege) => [privilege, true])
);

const setupRoute = (update: jest.Mock) => {
  const router = httpServiceMock.createRouter();
  const addVersion = jest.fn();
  (router.versioned.patch as jest.Mock).mockReturnValue({ addVersion });

  registerUpdateWorkerRoute({
    router,
    logger: loggingSystemMock.createLogger(),
    getSpaceId: () => 'default',
    getWorkersService: () => ({ update }),
  } as unknown as RouteDependencies);

  const handler = addVersion.mock.calls[0][1] as (
    context: unknown,
    request: ReturnType<typeof httpServerMock.createKibanaRequest>,
    response: ReturnType<typeof httpServerMock.createResponseFactory>
  ) => Promise<unknown>;

  return { router, handler };
};

describe('registerUpdateWorkerRoute', () => {
  it('requires alertzero_write and checks Workflows managed-update as extended privileges', () => {
    const { router } = setupRoute(jest.fn());
    const [{ security }] = (router.versioned.patch as jest.Mock).mock.calls[0] as [
      { security: { authz: { requiredPrivileges: string[]; extendedPrivileges: string[] } } }
    ];

    expect(security.authz.requiredPrivileges).toEqual([ALERTZERO_API_PRIVILEGE_WRITE]);
    expect(security.authz.extendedPrivileges).toEqual([
      ...WorkflowsManagementOperationPrivileges.updateManaged,
    ]);
  });

  it('maps unavailable to 503 when enablement is authorized', async () => {
    const update = jest.fn().mockResolvedValue({ outcome: 'unavailable' });
    const { handler } = setupRoute(update);
    const response = httpServerMock.createResponseFactory();

    await handler(
      {},
      httpServerMock.createKibanaRequest({
        params: { workerId: TRIAGE },
        body: { enabled: true },
        kibanaRequestState: {
          requestId: '123',
          requestUuid: '123e4567-e89b-12d3-a456-426614174000',
          startTime: new Date('2025-01-01T00:00:00.000Z').getTime(),
          authzResult: managedUpdateAuthzResult,
        },
      }),
      response
    );

    expect(update).toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 503,
      body: {
        message: 'Worker settings are temporarily unavailable; try again',
      },
    });
    expect(response.customError).not.toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 501 })
    );
  });

  it('returns 403 when enabling a worker without managed-update privileges', async () => {
    const update = jest.fn();
    const { handler } = setupRoute(update);
    const response = httpServerMock.createResponseFactory();

    await handler(
      {},
      httpServerMock.createKibanaRequest({
        params: { workerId: TRIAGE },
        body: { enabled: true },
      }),
      response
    );

    expect(update).not.toHaveBeenCalled();
    expect(response.forbidden).toHaveBeenCalledWith({
      body: {
        message: 'Enabling or disabling a worker requires update access to managed workflows',
      },
    });
  });

  it('updates settings without Workflows managed-update privileges', async () => {
    const update = jest.fn().mockResolvedValue({
      outcome: 'updated',
      response: { worker: { id: TRIAGE } },
    });
    const { handler } = setupRoute(update);
    const response = httpServerMock.createResponseFactory();

    await handler(
      {},
      httpServerMock.createKibanaRequest({
        params: { workerId: TRIAGE },
        body: { settingsRevision: 1, settings: { autonomy: 'manual' } },
      }),
      response
    );

    expect(update).toHaveBeenCalled();
    expect(response.forbidden).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalled();
  });
});
