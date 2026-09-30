/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { SECURITY_SOLUTION_DEFAULT_INDEX_ID } from '@kbn/management-settings-ids';
import type { RouteDependencies } from '../register_routes';
import { registerHuntIndexScopeRoute } from './index_scope';
import {
  resolveHuntScope,
  type ResolvedHuntScope,
} from '../../services/watches/hunt/common/resolve_index_scope';

jest.mock('../../services/watches/hunt/common/resolve_index_scope', () => {
  const actual = jest.requireActual('../../services/watches/hunt/common/resolve_index_scope');
  return { ...actual, resolveHuntScope: jest.fn() };
});

const resolveHuntScopeMock = resolveHuntScope as jest.MockedFunction<typeof resolveHuntScope>;

const UNIVERSE = ['logs-*', 'filebeat-*', '-*elastic-cloud-logs-*'];

const okScope: ResolvedHuntScope = {
  status: 'ok',
  resolution: 'universe',
  index_patterns: UNIVERSE,
  missing: [],
  report_matches: [],
  actionable_indices: ['logs-endpoint.events.process-default*'],
  window: { from: 'now-7d', to: 'now' },
  row_limit: 100,
  discovered: [
    {
      index_pattern: 'logs-endpoint.events.process-*',
      dataset: 'endpoint.events.process',
      vendor: 'endpoint',
      data_streams: ['logs-endpoint.events.process-default'],
      search_patterns: ['logs-endpoint.events.process-*'],
    },
  ],
};

const { discovered: _discovered, ...wireScope } = okScope;

const makeDeps = ({
  spaceId = 'default',
  indexPatterns = UNIVERSE,
}: { spaceId?: string; indexPatterns?: string[] } = {}) => {
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
  const uiSettingsGet = jest.fn().mockResolvedValue(indexPatterns);
  const context = {
    core: Promise.resolve({
      elasticsearch: { client: { asCurrentUser, asInternalUser } },
      uiSettings: { client: { get: uiSettingsGet } },
    }),
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
    uiSettingsGet,
  };
};

describe('registerHuntIndexScopeRoute', () => {
  beforeEach(() => {
    resolveHuntScopeMock.mockReset().mockResolvedValue(okScope);
  });

  it('requires only read privilege', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.security.authz.requiredPrivileges).toEqual(['alertzero_read']);
  });

  it('is an internal route', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.access).toBe('internal');
  });

  it('returns one scope object with no discovered key', async () => {
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, httpServerMock.createKibanaRequest(), response);

    expect(resolveHuntScopeMock).toHaveBeenCalledTimes(1);
    expect(response.ok).toHaveBeenCalledWith({ body: wireScope });
  });

  it('passes the universe read from uiSettings to resolveHuntScope', async () => {
    const patterns = ['logs-*', 'winlogbeat-*', '-*elastic-cloud-logs-*'];
    const { handler, context, uiSettingsGet } = makeDeps({ indexPatterns: patterns });
    const response = httpServerMock.createResponseFactory();

    await handler(context, httpServerMock.createKibanaRequest(), response);

    expect(uiSettingsGet).toHaveBeenCalledWith(SECURITY_SOLUTION_DEFAULT_INDEX_ID);
    expect(resolveHuntScopeMock).toHaveBeenCalledWith(
      expect.objectContaining({ indexPatterns: patterns })
    );
  });

  it('resolves against the request space, not the default one', async () => {
    const { handler, context } = makeDeps({ spaceId: 'hunt-space' });
    const response = httpServerMock.createResponseFactory();

    await handler(context, httpServerMock.createKibanaRequest(), response);

    expect(resolveHuntScopeMock).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'hunt-space' })
    );
  });

  it('reads as the current user so the caller index privileges apply', async () => {
    const { handler, context, asCurrentUser, asInternalUser } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, httpServerMock.createKibanaRequest(), response);

    expect(resolveHuntScopeMock).toHaveBeenCalledWith(
      expect.objectContaining({ esClient: asCurrentUser })
    );
    expect(resolveHuntScopeMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ esClient: asInternalUser })
    );
  });

  it('logs and returns a generic 500 when resolution throws', async () => {
    resolveHuntScopeMock.mockRejectedValue(new Error('cluster down'));
    const { handler, context, logger } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, httpServerMock.createKibanaRequest(), response);

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('cluster down'));
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to resolve hunt index scope' },
    });
  });
});
