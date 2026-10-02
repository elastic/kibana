/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { RouteDependencies } from '../register_routes';
import { registerWriteHuntEvidenceRoute } from './write_hunt_evidence';

const makeDeps = ({ spaceId = 'default' }: { spaceId?: string } = {}) => {
  const addVersion = jest.fn();
  const router = { versioned: { post: jest.fn().mockReturnValue({ addVersion }) } };
  const logger = loggingSystemMock.createLogger();

  registerWriteHuntEvidenceRoute({
    router: router as unknown as RouteDependencies['router'],
    logger,
    getSpaceId: () => spaceId,
  } as unknown as RouteDependencies);

  const asInternalUser = { update: jest.fn().mockResolvedValue({}) };
  const context = {
    alertzero: Promise.resolve({ subscription: 'available', hasRequiredDependencies: true }),
    core: Promise.resolve({
      elasticsearch: { client: { asInternalUser } },
      uiSettings: { client: { get: jest.fn().mockResolvedValue(true) } },
    }),
  };

  return {
    routeConfig: router.versioned.post.mock.calls[0][0],
    handler: addVersion.mock.calls[0][1] as (
      context: unknown,
      request: ReturnType<typeof httpServerMock.createKibanaRequest>,
      response: ReturnType<typeof httpServerMock.createResponseFactory>
    ) => Promise<unknown>,
    context,
    asInternalUser,
    logger,
  };
};

const requestFor = (body: Record<string, unknown> = {}) =>
  httpServerMock.createKibanaRequest({
    body: {
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'complete',
      totalHits: 0,
      ...body,
    },
  });

describe('registerWriteHuntEvidenceRoute', () => {
  it('requires write privilege, because it stamps a report as hunted', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.security.authz.requiredPrivileges).toEqual(['alertzero_write']);
  });

  it('is an internal route', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.access).toBe('internal');
  });

  it('is gated by withAlertZeroEnabled: 404s when the space setting is off, without writing', async () => {
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();
    const gatedContext = {
      ...context,
      core: Promise.resolve({
        elasticsearch: { client: { asInternalUser: { update: jest.fn() } } },
        uiSettings: { client: { get: jest.fn().mockResolvedValue(false) } },
      }),
    };

    await handler(gatedContext, requestFor(), response);

    expect(response.notFound).toHaveBeenCalled();
  });

  it('writes with the internal user client, keyed by the request space', async () => {
    const { handler, context, asInternalUser } = makeDeps({ spaceId: 'hunt-space' });

    await handler(context, requestFor({ runId: 'run-9' }), httpServerMock.createResponseFactory());

    expect(asInternalUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.kibana-threat-reports',
        id: 'report-1',
        script: expect.objectContaining({
          params: expect.objectContaining({
            space_id: 'hunt-space',
            last_hunt_run_id: 'run-9',
            last_hunt_status: 'clean',
            last_hunt_event_hit_count: 0,
          }),
        }),
      })
    );
  });

  it('returns acknowledged: true on success', async () => {
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(response.ok).toHaveBeenCalledWith({ body: { acknowledged: true } });
  });

  it('logs and returns a generic 500 when the write fails', async () => {
    const { handler, context, asInternalUser, logger } = makeDeps();
    asInternalUser.update.mockRejectedValue(new Error('index unavailable'));
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('index unavailable'));
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to write hunt evidence' },
    });
  });
});
