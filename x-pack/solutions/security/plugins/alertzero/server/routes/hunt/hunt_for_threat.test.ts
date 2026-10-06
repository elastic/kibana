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
import { registerHuntForThreatRoute } from './hunt_for_threat';
import {
  resolveHuntScope,
  type ResolvedHuntScope,
} from '../../services/watches/hunt/common/resolve_index_scope';
import { huntForThreat } from '../../services/watches/hunt/tier1/hunt_for_threat';
import type { HuntForThreatServiceResult } from '../../services/watches/hunt/tier1/types';

jest.mock('../../services/watches/hunt/common/resolve_index_scope', () => {
  const actual = jest.requireActual('../../services/watches/hunt/common/resolve_index_scope');
  return { ...actual, resolveHuntScope: jest.fn() };
});
jest.mock('../../services/watches/hunt/tier1/hunt_for_threat', () => ({
  huntForThreat: jest.fn(),
}));

const resolveHuntScopeMock = resolveHuntScope as jest.MockedFunction<typeof resolveHuntScope>;
const huntForThreatMock = huntForThreat as jest.MockedFunction<typeof huntForThreat>;

const UNIVERSE = ['logs-*', 'filebeat-*', '-*elastic-cloud-logs-*'];

const okScope: ResolvedHuntScope = {
  status: 'ok',
  resolution: 'universe',
  index_patterns: UNIVERSE,
  missing: [],
  report_matches: [],
  actionable_indices: [],
  window: { from: 'now-7d', to: 'now' },
  row_limit: 100,
  discovered: [],
};

const { discovered: _discovered, ...wireScope } = okScope;

const tier1Result: HuntForThreatServiceResult = {
  status: 'no_environment_hits',
  has_confirmed_hit: false,
  searched_iocs: 1,
  searched_techniques: 0,
  resolved_iocs: [],
  resolved_techniques: [],
  time_range: { from: 'now-7d', to: 'now' },
  counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
  hits: [],
  affected_assets: { hosts: [], users: [], services: [] },
  per_index: [],
};

const makeDeps = ({
  spaceId = 'default',
  indexPatterns = UNIVERSE,
}: { spaceId?: string; indexPatterns?: string[] } = {}) => {
  const addVersion = jest.fn();
  const router = { versioned: { post: jest.fn().mockReturnValue({ addVersion }) } };
  const logger = loggingSystemMock.createLogger();

  registerHuntForThreatRoute({
    router: router as unknown as RouteDependencies['router'],
    logger,
    getSpaceId: () => spaceId,
  } as unknown as RouteDependencies);

  const asCurrentUser = { search: jest.fn() };
  const asInternalUser = { search: jest.fn() };
  const uiSettingsGet = jest.fn().mockResolvedValue(indexPatterns);
  const context = {
    alertzero: Promise.resolve({ subscription: 'available', hasRequiredDependencies: true }),
    core: Promise.resolve({
      elasticsearch: { client: { asCurrentUser, asInternalUser } },
      uiSettings: { client: { get: uiSettingsGet } },
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
    asCurrentUser,
    asInternalUser,
    logger,
    uiSettingsGet,
  };
};

const requestFor = (body: Record<string, unknown> = {}) =>
  httpServerMock.createKibanaRequest({ body });

describe('registerHuntForThreatRoute', () => {
  beforeEach(() => {
    resolveHuntScopeMock.mockReset().mockResolvedValue(okScope);
    huntForThreatMock.mockReset().mockResolvedValue(tier1Result);
  });

  it('requires only read privilege', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.security.authz.requiredPrivileges).toEqual(['alertzero_read']);
  });

  it('is an internal route', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.access).toBe('internal');
  });

  it('resolves scope against the request space, not the default one', async () => {
    const { handler, context } = makeDeps({ spaceId: 'hunt-space' });

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(resolveHuntScopeMock).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'hunt-space', indexPatterns: UNIVERSE })
    );
  });

  it('reads the Security Solution default data view as the hunt universe', async () => {
    const { handler, context, uiSettingsGet } = makeDeps({
      indexPatterns: ['logs-*', 'winlogbeat-*'],
    });

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(uiSettingsGet).toHaveBeenCalledWith(SECURITY_SOLUTION_DEFAULT_INDEX_ID);
    expect(resolveHuntScopeMock).toHaveBeenCalledWith(
      expect.objectContaining({ indexPatterns: ['logs-*', 'winlogbeat-*'] })
    );
  });

  it('searches as the current user so the caller index privileges apply', async () => {
    const { handler, context, asCurrentUser, asInternalUser } = makeDeps();

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(huntForThreatMock).toHaveBeenCalledWith(asCurrentUser, expect.anything());
    expect(huntForThreatMock).not.toHaveBeenCalledWith(asInternalUser, expect.anything());
  });

  it('passes search_patterns from the resolved scope to huntForThreat', async () => {
    const { handler, context } = makeDeps();

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(huntForThreatMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        scope: {
          search_patterns: UNIVERSE,
          window: okScope.window,
          row_limit: okScope.row_limit,
        },
      })
    );
  });

  it('refuses a blocked scope with 409 rather than reading as a clean zero-hit search', async () => {
    resolveHuntScopeMock.mockResolvedValue({
      ...okScope,
      status: 'blocked',
      resolution: 'blocked:empty_universe',
      index_patterns: [],
      missing: ['logs-*'],
    });
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(huntForThreatMock).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 409,
      body: { message: expect.stringContaining('logs-*') },
    });
  });

  it('omits internal grounding digests from the response body', async () => {
    huntForThreatMock.mockResolvedValue({
      ...tier1Result,
      sample_event_summaries: ['action=AssumeRole user=svc-deploy'],
    });
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    const { body } = response.ok.mock.calls[0][0] as { body: { result: Record<string, unknown> } };
    expect(body.result).not.toHaveProperty('sample_event_summaries');
    expect(body.result).toEqual(tier1Result);
  });

  it('returns the resolved scope without discovered alongside the result', async () => {
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { scope: wireScope, result: tier1Result },
    });
  });

  it('logs and returns a generic 500 when the search throws', async () => {
    huntForThreatMock.mockRejectedValue(new Error('search_phase_execution_exception'));
    const { handler, context, logger } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('search_phase_execution_exception')
    );
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to run hunt_for_threat' },
    });
  });
});
