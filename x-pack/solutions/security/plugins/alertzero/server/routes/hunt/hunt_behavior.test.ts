/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
} from '@kbn/alertzero-common';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import type { RouteDependencies } from '../register_routes';
import { registerHuntBehaviorRoute } from './hunt_behavior';
import { resolveScopedModel } from './lib/scoped_model';
import {
  resolveHuntScope,
  type ResolvedHuntScope,
} from '../../services/watches/hunt/common/resolve_index_scope';
import { describeUnsearched } from '../../services/watches/hunt/common/unsearched_patterns';
import { huntBehavior } from '../../services/watches/hunt/tier2/hunt_behavior';
import type { HuntBehaviorResult } from '../../services/watches/hunt/tier2/types';
import { withLinkedProjectTwins } from '../../services/watches/hunt/common/cps_scope';

jest.mock('./lib/scoped_model', () => ({
  resolveScopedModel: jest.fn(),
  resolveConfiguredScopedModel: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/watches/hunt/tier2/hunt_behavior', () => ({ huntBehavior: jest.fn() }));
jest.mock('../../services/watches/hunt/common/resolve_index_scope', () => {
  const actual = jest.requireActual('../../services/watches/hunt/common/resolve_index_scope');
  return { ...actual, resolveHuntScope: jest.fn() };
});

const resolveScopedModelMock = resolveScopedModel as jest.MockedFunction<typeof resolveScopedModel>;
const huntBehaviorMock = huntBehavior as jest.MockedFunction<typeof huntBehavior>;
const resolveHuntScopeMock = resolveHuntScope as jest.MockedFunction<typeof resolveHuntScope>;

const okScope: ResolvedHuntScope = {
  status: 'ok',
  resolution: 'universe',
  index_patterns: [],
  missing: [],
  report_matches: [],
  actionable_indices: [],
  window: { from: 'now-7d', to: 'now' },
  row_limit: 100,
  discovered: [],
};

const model = { connector: { id: 'gpt' } } as unknown as ScopedModel;
const mitreDataClient = {
  list: jest.fn(),
  getById: jest.fn(),
  getStatus: jest.fn().mockReturnValue({ status: 'ready' }),
} as unknown as MitreAttackDataClient;
const tier2Result: HuntBehaviorResult = {
  status: 'no_behaviors_found',
  has_hit: false,
  behaviors: [],
  indexed_behaviors: [],
  next_step: 'no behaviors to corroborate',
};

const makeDeps = ({
  cpsEnabled = false,
  spaceId = 'default',
}: { cpsEnabled?: boolean; spaceId?: string } = {}) => {
  const addVersion = jest.fn();
  const router = { versioned: { post: jest.fn().mockReturnValue({ addVersion }) } };
  const logger = loggingSystemMock.createLogger();
  const inference = { getDefaultConnector: jest.fn() };
  const clusterClient = elasticsearchServiceMock.createClusterClient();
  const scoped = elasticsearchServiceMock.createScopedClusterClient();
  clusterClient.asScoped.mockReturnValue(scoped);

  registerHuntBehaviorRoute({
    router: router as unknown as RouteDependencies['router'],
    logger,
    getSpaceId: () => spaceId,
    getClusterClient: () => clusterClient,
    isCpsEnabled: () => cpsEnabled,
    getHuntServices: () =>
      ({
        getInference: () => inference,
        getSearchInferenceEndpoints: () => undefined,
        mitreDataClient,
      } as unknown as ReturnType<RouteDependencies['getHuntServices']>),
  } as unknown as RouteDependencies);

  const uiSettingsClient = { get: jest.fn().mockResolvedValue(true) };
  const context = {
    alertzero: Promise.resolve({
      subscription: 'available',
      hasRequiredDependencies: true,
      isSpaceSupported: true,
    }),
    core: Promise.resolve({
      uiSettings: { client: uiSettingsClient },
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
  };
};

const requestFor = (body: Record<string, unknown> = {}) =>
  httpServerMock.createKibanaRequest({
    body: { text: 'the actor dropped a signed loader', report_id: 'report-1', ...body },
  });

describe('registerHuntBehaviorRoute', () => {
  beforeEach(() => {
    resolveScopedModelMock.mockReset().mockResolvedValue({ ok: true, model });
    huntBehaviorMock.mockReset().mockResolvedValue(tier2Result);
    // Nothing dropped unless a test says so: the scope searches the universe it was handed.
    resolveHuntScopeMock
      .mockReset()
      .mockImplementation(async ({ indexPatterns, policySkippedPatterns = [] }) => ({
        ...okScope,
        index_patterns: indexPatterns,
        policy_skipped: policySkippedPatterns,
      }));
  });

  it('requires write privilege, because it spends tokens and can execute generated ES|QL', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.security.authz.requiredPrivileges).toEqual(['alertzero_write']);
  });

  it('is an internal route', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.access).toBe('internal');
  });

  it('resolves the frontier tier rather than the deployment default', async () => {
    const { handler, context } = makeDeps();

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    const featureIds = resolveScopedModelMock.mock.calls.map(([{ featureId }]) => featureId);
    expect(featureIds).toEqual([ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID]);
  });

  it('hands both extraction and ES|QL generation the frontier model', async () => {
    const frontier = { connector: { id: 'opus' } } as unknown as ScopedModel;
    resolveScopedModelMock.mockImplementation(async ({ featureId }) =>
      featureId === ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID
        ? { ok: true, model: frontier }
        : { ok: false, reason: 'no_connector', message: 'not a Tier 2 tier' }
    );
    const { handler, context } = makeDeps();

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(huntBehaviorMock.mock.calls[0][0]).toEqual({ extraction: frontier, esql: frontier });
  });

  it('never resolves the efficient or balanced tiers, which Tier 2 has no consumer for', async () => {
    const { handler, context } = makeDeps();

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(resolveScopedModelMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ featureId: ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID })
    );
    expect(resolveScopedModelMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ featureId: ALERTZERO_BALANCED_INFERENCE_FEATURE_ID })
    );
  });

  it('runs as the current user so the caller index privileges bound generated ES|QL', async () => {
    const { handler, context, scoped } = makeDeps();

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(huntBehaviorMock).toHaveBeenCalledWith(
      { extraction: model, esql: model },
      expect.anything(),
      expect.anything(),
      scoped.asCurrentUser,
      mitreDataClient
    );
  });

  it('widens the allowed indices to linked projects only when cross-project search is on', async () => {
    const allowedIndicesOf = async (cpsEnabled: boolean) => {
      huntBehaviorMock.mockClear();
      const { handler, context } = makeDeps({ cpsEnabled });
      await handler(context, requestFor(), httpServerMock.createResponseFactory());
      return huntBehaviorMock.mock.calls[0][2].allowed_indices;
    };

    const local = await allowedIndicesOf(false);
    const widened = await allowedIndicesOf(true);

    expect(local?.length).toBeGreaterThan(0);
    expect(widened).toEqual(withLinkedProjectTwins(local ?? []));
    expect(widened).not.toEqual(local);
    expect(huntBehaviorMock.mock.calls[0][2].cross_project_search).toBe(true);
  });

  it('scopes the client to the request with the space project routing', async () => {
    const { handler, context, clusterClient } = makeDeps();
    const request = requestFor();

    await handler(context, request, httpServerMock.createResponseFactory());

    expect(clusterClient.asScoped).toHaveBeenCalledWith(request, { projectRouting: 'space' });
  });

  it('returns 503 when the inference plugin is absent', async () => {
    resolveScopedModelMock.mockResolvedValue({
      ok: false,
      reason: 'no_inference_plugin',
      message: 'inference is not installed',
    });
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(huntBehaviorMock).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 503,
      body: {
        message: 'inference is not installed',
        attributes: {
          tier2_skipped_reason: 'no_inference_plugin',
          unavailable_model_tiers: ['frontier'],
        },
      },
    });
  });

  it('returns 400 when no connector is configured', async () => {
    resolveScopedModelMock.mockResolvedValue({
      ok: false,
      reason: 'no_connector',
      message: 'no connector configured',
    });
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(huntBehaviorMock).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 400,
      body: {
        message: 'no connector configured',
        attributes: {
          tier2_skipped_reason: 'no_connector',
          unavailable_model_tiers: ['frontier'],
        },
      },
    });
  });

  it('fails with 500, not a missing-connector 400, when resolving a tier threw', async () => {
    resolveScopedModelMock.mockRejectedValue(new Error('connector store unavailable'));
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(huntBehaviorMock).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'connector store unavailable',
        attributes: {
          tier2_skipped_reason: 'resolution_error',
          unavailable_model_tiers: ['frontier'],
        },
      },
    });
  });

  it('answers with the most severe failure across the tiers, so a thrown resolution is not hidden behind a missing connector', async () => {
    resolveScopedModelMock.mockImplementation(async ({ featureId }) => {
      if (featureId === ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID) {
        throw new Error('connector store unavailable');
      }
      return { ok: false, reason: 'no_connector', message: 'no balanced connector' };
    });
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'connector store unavailable',
        attributes: {
          tier2_skipped_reason: 'resolution_error',
          unavailable_model_tiers: ['frontier'],
        },
      },
    });
  });

  it('answers 503 when the inference plugin is missing for any tier, whatever else failed', async () => {
    resolveScopedModelMock.mockImplementation(async ({ featureId }) =>
      featureId === ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID
        ? { ok: false, reason: 'no_inference_plugin', message: 'inference is not installed' }
        : { ok: false, reason: 'no_connector', message: 'no balanced connector' }
    );
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 503,
        body: expect.objectContaining({ message: 'inference is not installed' }),
      })
    );
  });

  it('forwards the extraction threshold and report context to the service', async () => {
    const { handler, context } = makeDeps();

    await handler(
      context,
      requestFor({ llm_confidence_threshold: 0.8, iocs: [{ type: 'ip', value: '1.2.3.4' }] }),
      httpServerMock.createResponseFactory()
    );

    expect(huntBehaviorMock).toHaveBeenCalledWith(
      { extraction: model, esql: model },
      expect.anything(),
      expect.objectContaining({
        report_id: 'report-1',
        llm_confidence_threshold: 0.8,
        iocs: [{ type: 'ip', value: '1.2.3.4' }],
      }),
      expect.anything(),
      mitreDataClient
    );
  });

  it('forwards excluded_iocs to the service when present', async () => {
    const { handler, context } = makeDeps();
    const excluded = [{ type: 'ip', value: '169.254.169.254' }];

    await handler(
      context,
      requestFor({ iocs: [{ type: 'hash', value: 'abc' }], excluded_iocs: excluded }),
      httpServerMock.createResponseFactory()
    );

    expect(huntBehaviorMock).toHaveBeenCalledWith(
      { extraction: model, esql: model },
      expect.anything(),
      expect.objectContaining({ excluded_iocs: excluded }),
      expect.anything(),
      mitreDataClient
    );
  });

  it('logs and returns a generic 500 when extraction throws', async () => {
    huntBehaviorMock.mockRejectedValue(new Error('model timed out'));
    const { handler, context, logger } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('model timed out'));
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: expect.stringContaining('LLM extraction failed') },
    });
  });

  describe('default data view names the scope dropped', () => {
    const UNIVERSE = ['logs-*', 'custom-edr-1', '-logs-elastic_agent*'];
    const SEARCHED = ['logs-*', '-logs-elastic_agent*'];
    const withUniverse = (options: Parameters<typeof makeDeps>[0] = {}) => {
      const deps = makeDeps(options);
      const context = {
        ...deps.context,
        core: Promise.resolve({
          uiSettings: {
            client: { get: jest.fn().mockResolvedValue([...UNIVERSE, '.alerts-security']) },
          },
        }),
      };
      return { ...deps, context };
    };
    const droppedScope: ResolvedHuntScope = {
      ...okScope,
      index_patterns: SEARCHED,
      missing: ['custom-edr-1'],
    };

    it('resolves the scope as the caller, in the request space, from the filtered universe', async () => {
      const { handler, context, scoped } = withUniverse({ spaceId: 'soc', cpsEnabled: true });

      await handler(context, requestFor(), httpServerMock.createResponseFactory());

      expect(resolveHuntScopeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          esClient: scoped.asCurrentUser,
          spaceId: 'soc',
          indexPatterns: UNIVERSE,
          policySkippedPatterns: ['.alerts-security'],
          crossProjectSearch: true,
        })
      );
    });

    it('allows only what the scope kept, so no generated query names a dropped index', async () => {
      resolveHuntScopeMock.mockResolvedValue(droppedScope);
      const { handler, context } = withUniverse();

      await handler(context, requestFor(), httpServerMock.createResponseFactory());

      expect(huntBehaviorMock.mock.calls[0][2].allowed_indices).toEqual(SEARCHED);
    });

    it('puts the unqualified exclusions on the query under cross-project search', async () => {
      resolveHuntScopeMock.mockResolvedValue(droppedScope);
      const { handler, context } = withUniverse({ cpsEnabled: true });

      await handler(context, requestFor(), httpServerMock.createResponseFactory());

      const params = huntBehaviorMock.mock.calls[0][2];
      expect(params.allowed_indices).toEqual(withLinkedProjectTwins(SEARCHED));
      expect(params.excluded_indices).toEqual(['logs-elastic_agent*']);
    });

    it('reports a dropped name as an index_not_searched gap, ahead of the hunt gaps', async () => {
      const huntGap = {
        reason: 'unknown_technique_id' as const,
        technique_id: 'T9999',
        detail: 'T9999 is not in the ATT&CK catalog',
      };
      resolveHuntScopeMock.mockResolvedValue(droppedScope);
      huntBehaviorMock.mockResolvedValue({ ...tier2Result, incomplete: [huntGap] });
      const { handler, context } = withUniverse();
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor(), response);

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          ...tier2Result,
          incomplete: [
            { reason: 'index_not_searched', detail: describeUnsearched(['custom-edr-1']) },
            huntGap,
          ],
        },
      });
    });

    it('still hunts on a degraded scope', async () => {
      resolveHuntScopeMock.mockResolvedValue({ ...droppedScope, status: 'degraded' });
      const { handler, context } = withUniverse();
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor(), response);

      expect(huntBehaviorMock).toHaveBeenCalledTimes(1);
      expect(response.ok).toHaveBeenCalledTimes(1);
    });

    it('says the resolve failed when the scope is blocked on discovery_failed', async () => {
      resolveHuntScopeMock.mockResolvedValue({
        ...okScope,
        status: 'blocked',
        resolution: 'blocked:discovery_failed',
      });
      const { handler, context } = withUniverse();
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor(), response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 409,
        body: {
          message:
            'Hunt scope is blocked (blocked:discovery_failed): Hunt scope resolution failed, so no index was searched (checked: logs-*, custom-edr-1, -logs-elastic_agent*).',
        },
      });
      expect(huntBehaviorMock).not.toHaveBeenCalled();
    });

    it('adds no gap when the scope dropped nothing', async () => {
      const { handler, context } = withUniverse();
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor(), response);

      expect(response.ok).toHaveBeenCalledWith({ body: tier2Result });
    });

    it('refuses a blocked scope with 409 before resolving any model', async () => {
      resolveHuntScopeMock.mockResolvedValue({
        ...okScope,
        status: 'blocked',
        resolution: 'blocked:empty_universe',
        missing: ['logs-*', 'custom-edr-1'],
      });
      const { handler, context } = withUniverse();
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor(), response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 409,
        body: {
          message:
            "Hunt scope is blocked (blocked:empty_universe): No index in the space's default data view is visible to this hunt (checked: logs-*, custom-edr-1, -logs-elastic_agent*).",
        },
      });
      expect(huntBehaviorMock).not.toHaveBeenCalled();
      expect(resolveScopedModelMock).not.toHaveBeenCalled();
    });
  });

  describe('policy-skipped default data view entries', () => {
    const withSetting = (setting: string[]) => {
      const deps = makeDeps();
      const context = {
        ...deps.context,
        core: Promise.resolve({
          uiSettings: { client: { get: jest.fn().mockResolvedValue(setting) } },
        }),
      };
      return { ...deps, context };
    };

    it('leaves dot-prefixed entries out of the allowed indices', async () => {
      const { handler, context } = withSetting(['logs-*', '.alerts-security.alerts-default']);

      await handler(context, requestFor(), httpServerMock.createResponseFactory());

      const allowed = huntBehaviorMock.mock.calls[0][2].allowed_indices ?? [];
      expect(allowed).toContain('logs-*');
      expect(allowed.join(',')).not.toContain('.alerts-security');
    });

    // A data view with no positive entry is blocked by the scope check itself, before any
    // Elasticsearch call, so these two run the real one.
    const useRealScopeCheck = () =>
      resolveHuntScopeMock.mockImplementation(
        jest.requireActual('../../services/watches/hunt/common/resolve_index_scope')
          .resolveHuntScope
      );

    it('refuses with 409 before resolving any model when nothing searchable remains', async () => {
      useRealScopeCheck();
      const { handler, context, scoped } = withSetting(['.siem-signals-infosec-detections']);
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor(), response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 409,
        body: {
          message:
            'Hunt scope is blocked (blocked:empty_universe): The default data view has no pattern this hunt may search: hidden and alerts indices are never searched.',
        },
      });
      expect(huntBehaviorMock).not.toHaveBeenCalled();
      expect(resolveScopedModelMock).not.toHaveBeenCalled();
      expect(scoped.asCurrentUser.indices.resolveIndex).not.toHaveBeenCalled();
    });

    it('does not blame hidden indices when the data view holds only exclusions', async () => {
      useRealScopeCheck();
      const { handler, context } = withSetting(['-logs-elastic_agent*']);
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor(), response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 409,
        body: {
          message:
            'Hunt scope is blocked (blocked:empty_universe): The default data view has no pattern this hunt may search: it holds only exclusions.',
        },
      });
      expect(huntBehaviorMock).not.toHaveBeenCalled();
    });
  });
});
