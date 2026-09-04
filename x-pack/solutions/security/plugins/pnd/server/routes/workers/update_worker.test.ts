/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID } from '@kbn/pnd-common';
import type { RouteDependencies } from '../register_routes';
import { registerUpdateWorkerRoute } from './update_worker';

const TRIAGE = SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;

describe('registerUpdateWorkerRoute', () => {
  it('maps unavailable to 503', async () => {
    const router = httpServiceMock.createRouter();
    const addVersion = jest.fn();
    (router.versioned.patch as jest.Mock).mockReturnValue({ addVersion });
    const update = jest.fn().mockResolvedValue({ outcome: 'unavailable' });

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
    const response = httpServerMock.createResponseFactory();

    await handler(
      {},
      httpServerMock.createKibanaRequest({
        params: { workerId: TRIAGE },
        body: { enabled: true },
      }),
      response
    );

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
});
