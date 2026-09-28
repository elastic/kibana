/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ALERTZERO_REASONING_INFERENCE_FEATURE_ID } from '@kbn/alertzero-common';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { RouteDependencies } from '../register_routes';
import { registerHuntBehaviorRoute } from './hunt_behavior';
import { resolveScopedModel } from './lib/scoped_model';
import { huntBehavior } from '../../services/watches/hunt/tier2/hunt_behavior';
import type { HuntBehaviorResult } from '../../services/watches/hunt/tier2/types';

jest.mock('./lib/scoped_model', () => ({ resolveScopedModel: jest.fn() }));
jest.mock('../../services/watches/hunt/tier2/hunt_behavior', () => ({ huntBehavior: jest.fn() }));

const resolveScopedModelMock = resolveScopedModel as jest.MockedFunction<typeof resolveScopedModel>;
const huntBehaviorMock = huntBehavior as jest.MockedFunction<typeof huntBehavior>;

const model = { connector: { id: 'gpt' } } as unknown as ScopedModel;
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
      } as unknown as ReturnType<RouteDependencies['getHuntServices']>),
  } as unknown as RouteDependencies);

  const asCurrentUser = { search: jest.fn() };
  const asInternalUser = { search: jest.fn() };
  const uiSettingsClient = { get: jest.fn() };
  const context = {
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

  it('resolves the reasoning tier model rather than the deployment default', async () => {
    const { handler, context } = makeDeps();

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(resolveScopedModelMock).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: ALERTZERO_REASONING_INFERENCE_FEATURE_ID })
    );
  });

  it('runs as the current user so the caller index privileges bound generated ES|QL', async () => {
    const { handler, context, asCurrentUser, asInternalUser } = makeDeps();

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(huntBehaviorMock).toHaveBeenCalledWith(
      model,
      expect.anything(),
      expect.anything(),
      asCurrentUser
    );
    expect(huntBehaviorMock).not.toHaveBeenCalledWith(
      model,
      expect.anything(),
      expect.anything(),
      asInternalUser
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
        attributes: { tier2_skipped_reason: 'no_inference_plugin' },
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
        attributes: { tier2_skipped_reason: 'no_connector' },
      },
    });
  });

  it('forwards the extraction threshold and report context to the service', async () => {
    const { handler, context } = makeDeps();

    await handler(
      context,
      requestFor({ llm_confidence_threshold: 0.8, iocs: [{ type: 'ip', value: '1.2.3.4' }] }),
      httpServerMock.createResponseFactory()
    );

    expect(huntBehaviorMock).toHaveBeenCalledWith(
      model,
      expect.anything(),
      expect.objectContaining({
        report_id: 'report-1',
        llm_confidence_threshold: 0.8,
        iocs: [{ type: 'ip', value: '1.2.3.4' }],
      }),
      expect.anything()
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
