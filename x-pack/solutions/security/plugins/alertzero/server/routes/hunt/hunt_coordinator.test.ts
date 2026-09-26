/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { RouteDependencies } from '../register_routes';
import { registerHuntCoordinatorRoute } from './hunt_coordinator';
import { resolveScopedModel } from './lib/scoped_model';
import { huntCoordinator } from '../../services/watches/hunt/hunt_coordinator';
import type { HuntCoordinatorResult } from '../../services/watches/hunt/hunt_coordinator';
import { emptyHuntForThreatResult } from '../../services/watches/hunt/tier1/hunt_for_threat';

jest.mock('./lib/scoped_model', () => ({ resolveScopedModel: jest.fn() }));
jest.mock('../../services/watches/hunt/hunt_coordinator', () => ({ huntCoordinator: jest.fn() }));

const resolveScopedModelMock = resolveScopedModel as jest.MockedFunction<typeof resolveScopedModel>;
const huntCoordinatorMock = huntCoordinator as jest.MockedFunction<typeof huntCoordinator>;

const model = { connector: { id: 'gpt' } } as unknown as ScopedModel;

const coordinatorResult: HuntCoordinatorResult = {
  status: 'tier1_only',
  report_id: 'report-1',
  run_id: 'run-1',
  technologies: ['aws_iam'],
  index_patterns: ['logs-aws.cloudtrail-*'],
  tier1: {
    tier: 1,
    ...emptyHuntForThreatResult('no_environment_hits', [], [], { from: 'now-7d', to: 'now' }, ''),
  },
  message: 'no hits',
  next_step: 'stop',
  has_confirmed_hit: false,
  completeness: 'complete',
  completed_successfully: true,
};

const makeDeps = ({ spaceId = 'default' }: { spaceId?: string } = {}) => {
  const addVersion = jest.fn();
  const router = { versioned: { post: jest.fn().mockReturnValue({ addVersion }) } };
  const logger = loggingSystemMock.createLogger();

  registerHuntCoordinatorRoute({
    router: router as unknown as RouteDependencies['router'],
    logger,
    getSpaceId: () => spaceId,
    getHuntServices: () =>
      ({
        getInference: () => ({}),
        getSearchInferenceEndpoints: () => undefined,
      } as unknown as ReturnType<RouteDependencies['getHuntServices']>),
  } as unknown as RouteDependencies);

  const asCurrentUser = { search: jest.fn() };
  const asInternalUser = { search: jest.fn() };
  const context = {
    core: Promise.resolve({
      elasticsearch: { client: { asCurrentUser, asInternalUser } },
      uiSettings: { client: { get: jest.fn() } },
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
  httpServerMock.createKibanaRequest({ body: { report_id: 'report-1', ...body } });

const paramsOf = (call: number = 0) => huntCoordinatorMock.mock.calls[call][3];
const clientsOf = (call: number = 0) => huntCoordinatorMock.mock.calls[call][0];

describe('registerHuntCoordinatorRoute', () => {
  beforeEach(() => {
    resolveScopedModelMock.mockReset().mockResolvedValue({ ok: true, model });
    huntCoordinatorMock.mockReset().mockResolvedValue(coordinatorResult);
  });

  it('requires write privilege, because Tier 2 spends tokens and can execute generated ES|QL', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.security.authz.requiredPrivileges).toEqual(['alertzero_write']);
  });

  it('is an internal route', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.access).toBe('internal');
  });

  it('rejects an unknown technology with 400 before running anything', async () => {
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor({ technology: 'not_a_technology' }), response);

    expect(huntCoordinatorMock).not.toHaveBeenCalled();
    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: expect.stringContaining('not_a_technology') },
    });
  });

  it('treats an absent technology as "resolve from the environment"', async () => {
    const { handler, context } = makeDeps();

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(paramsOf().technology).toBeUndefined();
  });

  it('runs against the request space, not the default one', async () => {
    const { handler, context } = makeDeps({ spaceId: 'hunt-space' });

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(paramsOf().spaceId).toBe('hunt-space');
  });

  it('reads reports as the internal user and searches as the current user', async () => {
    const { handler, context, asCurrentUser, asInternalUser } = makeDeps();

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(clientsOf()).toEqual({
      esClient: asCurrentUser,
      reportsEsClient: asInternalUser,
    });
  });

  it('skips model resolution entirely when Tier 2 is never going to run', async () => {
    const { handler, context } = makeDeps();

    await handler(
      context,
      requestFor({ tier2_when: 'never' }),
      httpServerMock.createResponseFactory()
    );

    expect(resolveScopedModelMock).not.toHaveBeenCalled();
    expect(huntCoordinatorMock.mock.calls[0][1]).toBeUndefined();
  });

  it('passes no model when resolution fails, leaving the coordinator to degrade', async () => {
    resolveScopedModelMock.mockResolvedValue({
      ok: false,
      reason: 'no_connector',
      message: 'no connector configured',
    });
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(huntCoordinatorMock.mock.calls[0][1]).toBeUndefined();
    expect(response.ok).toHaveBeenCalled();
  });

  it('keeps the caller run_id so one sweep fans out under a single id', async () => {
    const { handler, context } = makeDeps();

    await handler(
      context,
      requestFor({ run_id: 'sweep-42' }),
      httpServerMock.createResponseFactory()
    );

    expect(paramsOf().run_id).toBe('sweep-42');
  });

  it('mints a run_id when the caller has no sweep to tie the run to', async () => {
    const { handler, context } = makeDeps();

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(paramsOf().run_id).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
  });

  it('logs and returns a generic 500 when the coordinator throws', async () => {
    huntCoordinatorMock.mockRejectedValue(new Error('tier1 search failed'));
    const { handler, context, logger } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('tier1 search failed'));
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Hunt coordinator failed' },
    });
  });
});
