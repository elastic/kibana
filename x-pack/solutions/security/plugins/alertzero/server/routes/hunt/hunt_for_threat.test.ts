/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
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
  cpsEnabled = false,
}: { spaceId?: string; indexPatterns?: string[]; cpsEnabled?: boolean } = {}) => {
  const addVersion = jest.fn();
  const router = { versioned: { post: jest.fn().mockReturnValue({ addVersion }) } };
  const logger = loggingSystemMock.createLogger();
  const clusterClient = elasticsearchServiceMock.createClusterClient();
  const scoped = elasticsearchServiceMock.createScopedClusterClient();
  clusterClient.asScoped.mockReturnValue(scoped);

  registerHuntForThreatRoute({
    router: router as unknown as RouteDependencies['router'],
    logger,
    getSpaceId: () => spaceId,
    getClusterClient: () => clusterClient,
    isCpsEnabled: () => cpsEnabled,
  } as unknown as RouteDependencies);

  const uiSettingsGet = jest.fn().mockResolvedValue(indexPatterns);
  const context = {
    alertzero: Promise.resolve({
      subscription: 'available',
      hasRequiredDependencies: true,
      isSpaceSupported: true,
    }),
    core: Promise.resolve({
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
    clusterClient,
    scoped,
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
    const { handler, context, scoped } = makeDeps();

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(huntForThreatMock).toHaveBeenCalledWith(scoped.asCurrentUser, expect.anything());
  });

  it('tells scope resolution whether cross-project search is on', async () => {
    const off = makeDeps();
    await off.handler(
      off.context,
      httpServerMock.createKibanaRequest(),
      httpServerMock.createResponseFactory()
    );
    expect(resolveHuntScopeMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ crossProjectSearch: false })
    );

    const on = makeDeps({ cpsEnabled: true });
    await on.handler(
      on.context,
      httpServerMock.createKibanaRequest(),
      httpServerMock.createResponseFactory()
    );
    expect(resolveHuntScopeMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ crossProjectSearch: true })
    );
  });

  it('scopes the client to the request with the space project routing', async () => {
    const { handler, context, clusterClient } = makeDeps();
    const request = requestFor();

    await handler(context, request, httpServerMock.createResponseFactory());

    expect(clusterClient.asScoped).toHaveBeenCalledWith(request, { projectRouting: 'space' });
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

  const NOTHING_VISIBLE =
    "No index in the space's default data view is visible to this hunt (checked: logs-*, filebeat-*, -*elastic-cloud-logs-*).";
  it.each([
    [
      'only skipped entries',
      ['.siem-signals-x'],
      [],
      'The default data view has no pattern this hunt may search: hidden and alerts indices are never searched.',
    ],
    ['skipped and missing', ['.siem-signals-x'], ['custom-1'], NOTHING_VISIBLE],
    ['nothing skipped', [], ['custom-1'], NOTHING_VISIBLE],
  ])('words the 409 for a blocked scope with %s', async (_label, policySkipped, missing, text) => {
    resolveHuntScopeMock.mockResolvedValue({
      ...okScope,
      status: 'blocked',
      resolution: 'blocked:empty_universe',
      index_patterns: [],
      missing,
      policy_skipped: policySkipped,
    });
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 409,
      body: { message: `Hunt scope is blocked (blocked:empty_universe): ${text}` },
    });
  });

  it('says a data view of only exclusions holds only exclusions', async () => {
    resolveHuntScopeMock.mockResolvedValue({
      ...okScope,
      status: 'blocked',
      resolution: 'blocked:empty_universe',
      index_patterns: [],
      missing: [],
    });
    const { handler, context } = makeDeps({ indexPatterns: ['-logs-elastic_agent*'] });
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 409,
      body: {
        message:
          'Hunt scope is blocked (blocked:empty_universe): The default data view has no pattern this hunt may search: it holds only exclusions.',
      },
    });
  });

  it('says the resolve failed for discovery_failed, whatever was skipped', async () => {
    resolveHuntScopeMock.mockResolvedValue({
      ...okScope,
      status: 'blocked',
      resolution: 'blocked:discovery_failed',
      index_patterns: [],
      missing: [],
      policy_skipped: ['.siem-signals-x'],
    });
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 409,
      body: {
        message:
          'Hunt scope is blocked (blocked:discovery_failed): Hunt scope resolution failed, so no index was searched (checked: logs-*, filebeat-*, -*elastic-cloud-logs-*).',
      },
    });
  });

  it('hands the filtered universe and the skipped list to resolveHuntScope', async () => {
    const { handler, context } = makeDeps({
      indexPatterns: ['logs-*', '.alerts-security.alerts-default'],
    });

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(resolveHuntScopeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        indexPatterns: ['logs-*'],
        policySkippedPatterns: ['.alerts-security.alerts-default'],
      })
    );
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

  it('reports a name the scope dropped as an index_not_searched gap, ahead of the search gaps', async () => {
    const searchGap = { reason: 'search_partial' as const, detail: 'one shard failed' };
    resolveHuntScopeMock.mockResolvedValue({
      ...okScope,
      index_patterns: ['logs-*'],
      missing: ['custom-edr-1'],
    });
    huntForThreatMock.mockResolvedValue({ ...tier1Result, incomplete: [searchGap] });
    const { handler, context } = makeDeps({ indexPatterns: ['logs-*', 'custom-edr-1'] });
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    // The search gets what the scope kept, not the data view that still names the dropped index.
    expect(huntForThreatMock.mock.calls[0][1].scope.search_patterns).toEqual(['logs-*']);
    const { body } = response.ok.mock.calls[0][0] as {
      body: { result: { incomplete?: unknown[] } };
    };
    expect(body.result.incomplete).toEqual([
      {
        reason: 'index_not_searched',
        detail:
          'The default data view names `custom-edr-1`, which this hunt could not read (no read access, not found, or closed), so the hunt never searched there.',
      },
      searchGap,
    ]);
  });

  it('adds no gap for an unresolved wildcard, which stays in the searched list', async () => {
    resolveHuntScopeMock.mockResolvedValue({ ...okScope, missing: [UNIVERSE[0]] });
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    const { body } = response.ok.mock.calls[0][0] as { body: { result: object } };
    expect(body.result).not.toHaveProperty('incomplete');
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
