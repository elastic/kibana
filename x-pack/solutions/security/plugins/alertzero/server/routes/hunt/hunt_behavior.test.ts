/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { huntBehavior } from '../../services/watches/hunt/tier2/hunt_behavior';
import type { HuntBehaviorResult } from '../../services/watches/hunt/tier2/types';

jest.mock('./lib/scoped_model', () => ({
  resolveScopedModel: jest.fn(),
  resolveConfiguredScopedModel: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/watches/hunt/tier2/hunt_behavior', () => ({ huntBehavior: jest.fn() }));

const resolveScopedModelMock = resolveScopedModel as jest.MockedFunction<typeof resolveScopedModel>;
const huntBehaviorMock = huntBehavior as jest.MockedFunction<typeof huntBehavior>;

const model = { connector: { id: 'gpt' } } as unknown as ScopedModel;
const mitreDataClient = { list: jest.fn() } as unknown as MitreAttackDataClient;
const tier2Result: HuntBehaviorResult = {
  status: 'no_behaviors_found',
  has_hit: false,
  behaviors: [],
  indexed_behaviors: [],
  next_step: 'no behaviors to corroborate',
};

const makeDeps = () => {
  const addVersion = jest.fn();
  const router = { versioned: { post: jest.fn().mockReturnValue({ addVersion }) } };
  const logger = loggingSystemMock.createLogger();
  const inference = { getDefaultConnector: jest.fn() };

  registerHuntBehaviorRoute({
    router: router as unknown as RouteDependencies['router'],
    logger,
    getHuntServices: () =>
      ({
        getInference: () => inference,
        getSearchInferenceEndpoints: () => undefined,
        mitreDataClient,
      } as unknown as ReturnType<RouteDependencies['getHuntServices']>),
  } as unknown as RouteDependencies);

  const asCurrentUser = { search: jest.fn() };
  const asInternalUser = { search: jest.fn() };
  const uiSettingsClient = { get: jest.fn().mockResolvedValue(true) };
  const context = {
    alertzero: Promise.resolve({
      subscription: 'available',
      hasRequiredDependencies: true,
      isSpaceSupported: true,
    }),
    core: Promise.resolve({
      elasticsearch: { client: { asCurrentUser, asInternalUser } },
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
    asCurrentUser,
    asInternalUser,
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
    const { handler, context, asCurrentUser, asInternalUser } = makeDeps();

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(huntBehaviorMock).toHaveBeenCalledWith(
      { extraction: model, esql: model },
      expect.anything(),
      expect.anything(),
      asCurrentUser,
      mitreDataClient
    );
    expect(huntBehaviorMock).not.toHaveBeenCalledWith(
      { extraction: model, esql: model },
      expect.anything(),
      expect.anything(),
      asInternalUser,
      mitreDataClient
    );
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
});
