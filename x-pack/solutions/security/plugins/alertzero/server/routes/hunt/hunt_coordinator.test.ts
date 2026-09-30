/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { HuntCoordinatorResponse } from '@kbn/alertzero-common';
import type { RouteDependencies } from '../register_routes';
import { buildSseAttachmentId } from '../../services/watches/hunt/common/sse_mapper';
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
    alertzero: Promise.resolve({ subscription: 'available', hasRequiredDependencies: true }),
    core: Promise.resolve({
      elasticsearch: { client: { asCurrentUser, asInternalUser } },
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

  it('still resolves the model when Tier 2 is never going to run, so scope resolution can use it', async () => {
    const { handler, context } = makeDeps();

    await handler(
      context,
      requestFor({ tier2_when: 'never' }),
      httpServerMock.createResponseFactory()
    );

    expect(resolveScopedModelMock).toHaveBeenCalledTimes(1);
    expect(huntCoordinatorMock.mock.calls[0][1]).toBe(model);
    expect(paramsOf().tier2_when).toBe('never');
  });

  it('passes no model on a never run without a connector, and the request still succeeds', async () => {
    resolveScopedModelMock.mockResolvedValue({
      ok: false,
      reason: 'no_connector',
      message: 'no connector configured',
    });
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor({ tier2_when: 'never' }), response);

    expect(huntCoordinatorMock.mock.calls[0][1]).toBeUndefined();
    expect(response.ok).toHaveBeenCalled();
  });

  it('passes no model when resolution throws, logging at debug rather than failing the request', async () => {
    resolveScopedModelMock.mockRejectedValue(new Error('connector store unavailable'));
    const { handler, context, logger } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(huntCoordinatorMock.mock.calls[0][1]).toBeUndefined();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('connector store unavailable')
    );
    expect(logger.error).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalled();
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

  /**
   * The gate that puts `sse` on the response is three conditions wide (confirmed hit,
   * a named report, the request's space) and the mapper it calls is real here. A
   * regression in any of them removes or mis-scopes every attachment the hunt writes.
   */
  describe('SSE entries on the response', () => {
    const confirmedResult: HuntCoordinatorResult = {
      ...coordinatorResult,
      status: 'tier1_and_tier2',
      message: 'behaviors proposed',
      has_confirmed_hit: true,
      tier2: {
        tier: 2,
        status: 'behaviors_proposed',
        behaviors: [
          {
            technique_id: 'T1078.004',
            evidence_quote: 'AssumeRole into OrgAdminBoundary',
            llm_confidence: 0.9,
            confidence: 0.9,
            technique_name: 'Valid Accounts: Cloud Accounts',
            reference: 'https://attack.mitre.org/techniques/T1078/004/',
            tactic_ids: ['TA0001'],
            proposed_esql_rule: 'FROM logs-aws.cloudtrail-default | WHERE true',
            rule_name: 'AssumeRole into high-risk policy boundary',
            severity: 'high',
            risk_score: 73,
            execution: { executed: true, row_count: 2, hit: true },
          },
        ],
        indexed_behaviors: [],
        has_hit: true,
        next_step: 'Review the proposed rule.',
      },
    };

    const sseOf = (response: ReturnType<typeof httpServerMock.createResponseFactory>) => {
      const [options] = response.ok.mock.calls[0];
      if (!options) throw new Error('expected an ok response carrying a body');
      return (options.body as HuntCoordinatorResponse).sse;
    };

    it('attaches one entry per corroborated technique on a confirmed hit', async () => {
      huntCoordinatorMock.mockResolvedValue(confirmedResult);
      const { handler, context } = makeDeps();
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor(), response);

      expect(sseOf(response)).toHaveLength(1);
      expect(sseOf(response)?.[0].attachment_id).toBe(
        buildSseAttachmentId({
          spaceId: 'default',
          reportId: 'report-1',
          techniqueId: 'T1078.004',
        })
      );
    });

    it('scopes attachment ids to the request space', async () => {
      huntCoordinatorMock.mockResolvedValue(confirmedResult);
      const { handler, context } = makeDeps({ spaceId: 'hunt-space' });
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor(), response);

      // Re-hunts are idempotent on this id, so a default-space id in another space
      // would overwrite that space's attachment.
      expect(sseOf(response)?.[0].attachment_id).toBe(
        buildSseAttachmentId({
          spaceId: 'hunt-space',
          reportId: 'report-1',
          techniqueId: 'T1078.004',
        })
      );
      expect(sseOf(response)?.[0].attachment_id).not.toBe(
        buildSseAttachmentId({
          spaceId: 'default',
          reportId: 'report-1',
          techniqueId: 'T1078.004',
        })
      );
    });

    it('sends no entries for a run that confirmed nothing', async () => {
      const { handler, context } = makeDeps();
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor(), response);

      expect(sseOf(response)).toBeUndefined();
    });

    it('sends no entries for a hit on an ad hoc hunt, which has no report to attach to', async () => {
      huntCoordinatorMock.mockResolvedValue(confirmedResult);
      const { handler, context } = makeDeps();
      const response = httpServerMock.createResponseFactory();

      await handler(
        context,
        httpServerMock.createKibanaRequest({ body: { text: 'ad hoc hunt' } }),
        response
      );

      expect(response.ok).toHaveBeenCalled();
      expect(sseOf(response)).toBeUndefined();
    });
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
