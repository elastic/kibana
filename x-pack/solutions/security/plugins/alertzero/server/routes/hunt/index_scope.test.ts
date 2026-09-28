/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { HuntTechnology, ResolvedIndexScope } from '@kbn/alertzero-common';
import type { RouteDependencies } from '../register_routes';
import { registerHuntIndexScopeRoute } from './index_scope';
import {
  HUNT_TECHNOLOGIES,
  resolveIndexScope,
} from '../../services/watches/hunt/common/resolve_index_scope';

jest.mock('../../services/watches/hunt/common/resolve_index_scope', () => {
  const actual = jest.requireActual('../../services/watches/hunt/common/resolve_index_scope');
  return { ...actual, resolveIndexScope: jest.fn() };
});

const resolveIndexScopeMock = resolveIndexScope as jest.MockedFunction<typeof resolveIndexScope>;

const makeDeps = ({ spaceId = 'default' }: { spaceId?: string } = {}) => {
  const addVersion = jest.fn();
  const router = { versioned: { get: jest.fn().mockReturnValue({ addVersion }) } };
  const logger = loggingSystemMock.createLogger();

  registerHuntIndexScopeRoute({
    router: router as unknown as RouteDependencies['router'],
    logger,
    getSpaceId: () => spaceId,
  } as unknown as RouteDependencies);

  const asCurrentUser = { search: jest.fn() };
  const asInternalUser = { search: jest.fn() };
  const context = {
    core: Promise.resolve({ elasticsearch: { client: { asCurrentUser, asInternalUser } } }),
  };

  return {
    routeConfig: router.versioned.get.mock.calls[0][0],
    handler: addVersion.mock.calls[0][1] as (
      context: unknown,
      request: ReturnType<typeof httpServerMock.createKibanaRequest>,
      response: ReturnType<typeof httpServerMock.createResponseFactory>
    ) => Promise<unknown>,
    context,
    asCurrentUser,
    asInternalUser,
    logger,
  };
};

const scopeFor = (technology: HuntTechnology): ResolvedIndexScope => ({
  technology,
  status: 'ok',
  required: [],
  optional: [],
  missing: [],
  window: { from: 'now-7d', to: 'now' },
  row_limit: 100,
});

describe('registerHuntIndexScopeRoute', () => {
  beforeEach(() => {
    resolveIndexScopeMock.mockReset();
    resolveIndexScopeMock.mockImplementation(async ({ technology }) => scopeFor(technology));
  });

  it('requires only read privilege', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.security.authz.requiredPrivileges).toEqual(['alertzero_read']);
  });

  it('is an internal route', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.access).toBe('internal');
  });

  it('resolves every known technology when the query names none', async () => {
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, httpServerMock.createKibanaRequest({ query: {} }), response);

    expect(resolveIndexScopeMock).toHaveBeenCalledTimes(HUNT_TECHNOLOGIES.length);
    expect(response.ok).toHaveBeenCalledWith({
      body: HUNT_TECHNOLOGIES.map((technology) => scopeFor(technology)),
    });
  });

  it('resolves only the requested technology', async () => {
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(
      context,
      httpServerMock.createKibanaRequest({ query: { technology: 'aws_iam' } }),
      response
    );

    expect(resolveIndexScopeMock).toHaveBeenCalledTimes(1);
    expect(resolveIndexScopeMock).toHaveBeenCalledWith(
      expect.objectContaining({ technology: 'aws_iam' })
    );
  });

  it('resolves against the request space, not the default one', async () => {
    const { handler, context } = makeDeps({ spaceId: 'hunt-space' });
    const response = httpServerMock.createResponseFactory();

    await handler(
      context,
      httpServerMock.createKibanaRequest({ query: { technology: 'aws_iam' } }),
      response
    );

    expect(resolveIndexScopeMock).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'hunt-space' })
    );
  });

  it('reads as the current user so the caller index privileges apply', async () => {
    const { handler, context, asCurrentUser, asInternalUser } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(
      context,
      httpServerMock.createKibanaRequest({ query: { technology: 'aws_iam' } }),
      response
    );

    expect(resolveIndexScopeMock).toHaveBeenCalledWith(
      expect.objectContaining({ esClient: asCurrentUser })
    );
    expect(resolveIndexScopeMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ esClient: asInternalUser })
    );
  });

  it('logs and returns a generic 500 when resolution throws', async () => {
    resolveIndexScopeMock.mockRejectedValue(new Error('cluster down'));
    const { handler, context, logger } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, httpServerMock.createKibanaRequest({ query: {} }), response);

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('cluster down'));
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to resolve hunt index scope' },
    });
  });
});
