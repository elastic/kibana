/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import {
  createAttachmentAlreadyExistsError,
  createAttachmentNotFoundError,
} from '@kbn/agent-builder-common';
import {
  ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
} from '@kbn/alertzero-common';
import type {
  HuntCoordinatorResponse,
  HuntCoordinatorResult as StoredHuntCoordinatorResult,
} from '@kbn/alertzero-common';
import { SECURITY_SOLUTION_DEFAULT_INDEX_ID } from '@kbn/management-settings-ids';
import type { RouteDependencies } from '../register_routes';
import type { HuntCoordinatorResultAttachment } from '../../../common/hunt_coordinator_result_attachment_schema';
import { buildSseAttachmentId } from '../../services/watches/hunt/common/sse_mapper';
import { InvalidHuntWindowError } from '../../services/watches/hunt/common/assert_hunt_window';
import { registerHuntCoordinatorRoute } from './hunt_coordinator';
import { resolveScopedModel } from './lib/scoped_model';
import { huntCoordinator } from '../../services/watches/hunt/hunt_coordinator';
import type { HuntCoordinatorResult } from '../../services/watches/hunt/hunt_coordinator';
import { emptyHuntForThreatResult } from '../../services/watches/hunt/tier1/hunt_for_threat';

jest.mock('./lib/scoped_model', () => ({
  resolveScopedModel: jest.fn(),
  resolveConfiguredScopedModel: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/watches/hunt/hunt_coordinator', () => ({ huntCoordinator: jest.fn() }));

const resolveScopedModelMock = resolveScopedModel as jest.MockedFunction<typeof resolveScopedModel>;
const huntCoordinatorMock = huntCoordinator as jest.MockedFunction<typeof huntCoordinator>;

const model = { connector: { id: 'gpt' } } as unknown as ScopedModel;

const UNIVERSE = ['logs-*', 'filebeat-*', '-*elastic-cloud-logs-*'];

const coordinatorResult: HuntCoordinatorResult = {
  status: 'tier1_only',
  report_id: 'report-1',
  run_id: 'run-1',
  index_patterns: UNIVERSE,
  tier2_targets: [],
  tier2_target_sources: [],
  report_intent_targets: [],
  actionable_indices: [],
  tier1: {
    tier: 1,
    ...emptyHuntForThreatResult('no_environment_hits', [], [], { from: 'now-7d', to: 'now' }, ''),
  },
  message: 'no hits',
  next_step: 'stop',
  has_confirmed_hit: false,
  completeness: 'complete',
  completed_successfully: true,
  headline: 'no confirmed hits: Tier 1 found no matches; Tier 2 skipped',
  narrative: 'Hunt Watch found no confirmed hits for threat report report-1.',
};

const makeDeps = ({
  spaceId = 'default',
  indexPatterns = UNIVERSE,
  agentBuilderStarted = true,
}: { spaceId?: string; indexPatterns?: string[]; agentBuilderStarted?: boolean } = {}) => {
  const addVersion = jest.fn();
  const router = { versioned: { post: jest.fn().mockReturnValue({ addVersion }) } };
  const logger = loggingSystemMock.createLogger();
  const attachmentsClient = {
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
  };
  const attachments = agentBuilderMocks.createStart().attachments;
  attachments.getScopedClient.mockResolvedValue(attachmentsClient as never);

  registerHuntCoordinatorRoute({
    router: router as unknown as RouteDependencies['router'],
    logger,
    getSpaceId: () => spaceId,
    getHuntServices: () =>
      ({
        getInference: () => ({}),
        getSearchInferenceEndpoints: () => undefined,
      } as unknown as ReturnType<RouteDependencies['getHuntServices']>),
    getAgentBuilderAttachments: () => {
      if (!agentBuilderStarted) {
        throw new Error(
          'agentBuilder.attachments is not available until the AlertZero plugin has started'
        );
      }
      return attachments;
    },
  } as unknown as RouteDependencies);

  const asCurrentUser = { search: jest.fn() };
  const asInternalUser = { search: jest.fn() };
  const uiSettingsGet = jest.fn().mockResolvedValue(indexPatterns);
  const context = {
    alertzero: Promise.resolve({
      subscription: 'available',
      hasRequiredDependencies: true,
      isSpaceSupported: true,
    }),
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
    attachments,
    attachmentsClient,
  };
};

const requestFor = (body: Record<string, unknown> = {}) =>
  httpServerMock.createKibanaRequest({
    body: { report_id: 'report-1', conversation_id: 'conv-1', ...body },
  });

const paramsOf = (call: number = 0) => huntCoordinatorMock.mock.calls[call][3];
const clientsOf = (call: number = 0) => huntCoordinatorMock.mock.calls[call][0];

const bodyOf = (response: ReturnType<typeof httpServerMock.createResponseFactory>) => {
  const [options] = response.ok.mock.calls[0];
  if (!options) throw new Error('expected an ok response carrying a body');
  return options.body as HuntCoordinatorResponse;
};

const envelopeOf = (
  attachmentsClient: ReturnType<typeof makeDeps>['attachmentsClient'],
  call: number = 0
): HuntCoordinatorResultAttachment => attachmentsClient.update.mock.calls[call][0].data;

/** The detached job finishes on its own microtasks, after the handler has already answered. */
const flushJob = () => new Promise((resolve) => setImmediate(resolve));

/** `Schema[K]` across every member of a `Schema` union that has `K`; `never` when none does. */
type PropOf<Schema, K extends PropertyKey> = Schema extends object
  ? K extends keyof Schema
    ? Schema[K]
    : never
  : never;

/**
 * Every key the service result has that the stored schema lacks, at any depth. The attachment
 * type stores what `validate` parsed and the result schema is not strict, so such a key would be
 * stripped before the hunt child reads it, and `const body: Stored = service` in the route would
 * not notice: excess-property checks do not apply when assigning from a variable.
 */
type FieldsMissingFromSchema<Service, Schema> = Service extends readonly (infer ServiceItem)[]
  ? Schema extends readonly (infer SchemaItem)[]
    ? FieldsMissingFromSchema<ServiceItem, SchemaItem>
    : never
  : Service extends object
  ? {
      [K in keyof Service]-?: [PropOf<Schema, K>] extends [never]
        ? K
        : FieldsMissingFromSchema<NonNullable<Service[K]>, NonNullable<PropOf<Schema, K>>>;
    }[keyof Service]
  : never;

type AssertNever<T extends never> = T;

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

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

  it('passes indexPatterns from the universe helper and never a technology', async () => {
    const patterns = ['logs-*', 'winlogbeat-*'];
    const { handler, context, uiSettingsGet } = makeDeps({ indexPatterns: patterns });

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(uiSettingsGet).toHaveBeenCalledWith(SECURITY_SOLUTION_DEFAULT_INDEX_ID);
    expect(paramsOf().indexPatterns).toEqual(patterns);
    expect(paramsOf()).not.toHaveProperty('technology');
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

    expect(resolveScopedModelMock).toHaveBeenCalledTimes(2);
    expect(huntCoordinatorMock.mock.calls[0][1]).toEqual({
      efficient: model,
      frontier: model,
    });
    expect(paramsOf().tier2_when).toBe('never');
  });

  it('resolves each tier on its own feature id', async () => {
    const { handler, context } = makeDeps();

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    const featureIds = resolveScopedModelMock.mock.calls.map(([{ featureId }]) => featureId);
    expect(featureIds).toEqual([
      ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
      ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
    ]);
  });

  it('degrades only the unavailable tier and still passes the others', async () => {
    resolveScopedModelMock.mockImplementation(async ({ featureId }) =>
      featureId === ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID
        ? { ok: false, reason: 'no_connector', message: 'no efficient connector' }
        : { ok: true, model }
    );
    const { handler, context, logger } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(huntCoordinatorMock.mock.calls[0][1]).toEqual({ frontier: model });
    expect(huntCoordinatorMock.mock.calls[0][1]).not.toHaveProperty('efficient');
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('efficient model unavailable')
    );
    // An ordinary missing connector stays at debug.
    expect(logger.warn).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalled();
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

    expect(huntCoordinatorMock.mock.calls[0][1]).toEqual({
      efficient: undefined,
      frontier: undefined,
    });
    expect(response.ok).toHaveBeenCalled();
  });

  it('passes no model when resolution throws, logging a warning rather than failing the request', async () => {
    resolveScopedModelMock.mockRejectedValue(new Error('connector store unavailable'));
    const { handler, context, logger } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);
    await flushJob();

    expect(huntCoordinatorMock.mock.calls[0][1]).toEqual({
      efficient: undefined,
      frontier: undefined,
    });
    // A resolution that threw is a fault, so it must be visible in production.
    expect(logger.warn).toHaveBeenCalledWith(
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

    expect(huntCoordinatorMock.mock.calls[0][1]).toEqual({
      efficient: undefined,
      frontier: undefined,
    });
    expect(response.ok).toHaveBeenCalled();
  });

  it('keeps the caller run_id so one sweep fans out under a single id, and echoes it', async () => {
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor({ run_id: 'sweep-42' }), response);

    expect(paramsOf().run_id).toBe('sweep-42');
    expect(bodyOf(response)).toEqual({
      run_id: 'sweep-42',
      state: 'running',
      result_attachment_id: 'hunt-coordinator-result-sweep-42',
    });
  });

  it('mints a run_id when the caller has no sweep to tie the run to, and returns it', async () => {
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    const minted = paramsOf().run_id;
    expect(minted).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(bodyOf(response)).toEqual({
      run_id: minted,
      state: 'running',
      result_attachment_id: `hunt-coordinator-result-${minted}`,
    });
  });

  describe('start + poll contract', () => {
    it('answers while the coordinator is still running, then writes the result when it finishes', async () => {
      const pending = deferred<HuntCoordinatorResult>();
      huntCoordinatorMock.mockReturnValue(pending.promise);
      const { handler, context, attachmentsClient } = makeDeps();
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor({ run_id: 'run-1' }), response);

      expect(response.ok).toHaveBeenCalledTimes(1);
      expect(bodyOf(response).state).toBe('running');
      expect(huntCoordinatorMock).toHaveBeenCalledTimes(1);
      expect(attachmentsClient.update).not.toHaveBeenCalled();

      pending.resolve(coordinatorResult);
      await flushJob();

      expect(attachmentsClient.update).toHaveBeenCalledTimes(1);
      expect(attachmentsClient.update).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        attachmentId: 'hunt-coordinator-result-run-1',
        data: {
          run_id: 'run-1',
          report_id: 'report-1',
          state: 'completed',
          result: coordinatorResult,
        },
      });
    });

    it('creates the hidden running placeholder on the Investigation before answering', async () => {
      const { handler, context, attachments, attachmentsClient } = makeDeps();
      const response = httpServerMock.createResponseFactory();
      const request = requestFor({ run_id: 'run-1' });

      await handler(context, request, response);

      expect(attachments.getScopedClient).toHaveBeenCalledWith({ request });
      expect(attachmentsClient.create).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        id: 'hunt-coordinator-result-run-1',
        type: 'security.hunt_coordinator_result',
        data: { run_id: 'run-1', report_id: 'report-1', state: 'running' },
        description: 'Hunt coordinator result (internal)',
        hidden: true,
        readonly: true,
      });
      expect(attachmentsClient.create.mock.invocationCallOrder[0]).toBeLessThan(
        response.ok.mock.invocationCallOrder[0]
      );
    });

    it('logs the terminal write with the run, report, space and state', async () => {
      const { handler, context, logger } = makeDeps({ spaceId: 'hunt-space' });

      await handler(
        context,
        requestFor({ run_id: 'run-1' }),
        httpServerMock.createResponseFactory()
      );
      await flushJob();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          'run_id=run-1 report_id=report-1 space_id=hunt-space state=completed'
        )
      );
    });

    it('refreshes an existing placeholder to running and still starts the run', async () => {
      const { handler, context, attachmentsClient } = makeDeps();
      attachmentsClient.create.mockRejectedValue(
        createAttachmentAlreadyExistsError({ attachmentId: 'hunt-coordinator-result-run-1' })
      );
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor({ run_id: 'run-1' }), response);

      expect(attachmentsClient.update).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        attachmentId: 'hunt-coordinator-result-run-1',
        data: { run_id: 'run-1', report_id: 'report-1', state: 'running' },
      });
      expect(huntCoordinatorMock).toHaveBeenCalledTimes(1);
      expect(bodyOf(response).state).toBe('running');

      await flushJob();

      expect(envelopeOf(attachmentsClient, 1).state).toBe('completed');
    });

    it('writes a failed envelope with the generic message when the coordinator throws, and logs the real error', async () => {
      huntCoordinatorMock.mockRejectedValue(new Error('tier1 search failed'));
      const { handler, context, logger, attachmentsClient } = makeDeps();
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor({ run_id: 'run-1' }), response);
      await flushJob();

      expect(response.ok).toHaveBeenCalledTimes(1);
      expect(response.customError).not.toHaveBeenCalled();
      expect(envelopeOf(attachmentsClient)).toEqual({
        run_id: 'run-1',
        report_id: 'report-1',
        state: 'failed',
        error: { message: 'Hunt coordinator failed' },
      });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('tier1 search failed'));
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('run_id=run-1 report_id=report-1 space_id=default state=failed')
      );
    });

    // The window check runs inside Tier 1, so it can no longer be a 400 on the start call.
    it('writes a failed envelope carrying the hunt window message', async () => {
      huntCoordinatorMock.mockRejectedValue(
        new InvalidHuntWindowError('time_range.from must be before time_range.to')
      );
      const { handler, context, attachmentsClient } = makeDeps();
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor({ run_id: 'run-1' }), response);
      await flushJob();

      expect(response.ok).toHaveBeenCalledTimes(1);
      expect(response.badRequest).not.toHaveBeenCalled();
      expect(envelopeOf(attachmentsClient)).toEqual({
        run_id: 'run-1',
        report_id: 'report-1',
        state: 'failed',
        error: { message: 'time_range.from must be before time_range.to' },
      });
    });

    it('falls back to a failed envelope when the completed result is rejected, naming validation as the likely cause', async () => {
      const { handler, context, logger, attachmentsClient } = makeDeps();
      attachmentsClient.update.mockRejectedValueOnce(
        new Error('Invalid attachment data for type "security.hunt_coordinator_result": too big')
      );
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor({ run_id: 'run-1' }), response);
      await flushJob();

      expect(response.ok).toHaveBeenCalledTimes(1);
      expect(attachmentsClient.update).toHaveBeenCalledTimes(2);
      expect(envelopeOf(attachmentsClient, 0).state).toBe('completed');
      expect(envelopeOf(attachmentsClient, 1)).toEqual({
        run_id: 'run-1',
        report_id: 'report-1',
        state: 'failed',
        error: { message: 'Hunt coordinator failed' },
      });
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'could not write the completed result to hunt-coordinator-result-run-1'
        )
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('likely a HuntCoordinatorResult validation failure: Invalid')
      );
    });

    it('logs at error and does not throw when the failed fallback is rejected too', async () => {
      const { handler, context, logger, attachmentsClient } = makeDeps();
      attachmentsClient.update.mockRejectedValue(new Error('conversation vanished'));
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor({ run_id: 'run-1' }), response);
      await flushJob();

      expect(response.ok).toHaveBeenCalledTimes(1);
      expect(attachmentsClient.update).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'could not write the failed envelope to hunt-coordinator-result-run-1 either'
        )
      );
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('conversation vanished'));
    });

    it('does not retry a rejected failed envelope, since there is nothing smaller to write', async () => {
      const { handler, context, logger, attachmentsClient } = makeDeps();
      huntCoordinatorMock.mockRejectedValue(new Error('tier1 search failed'));
      attachmentsClient.update.mockRejectedValue(new Error('conversation vanished'));
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor({ run_id: 'run-1' }), response);
      await flushJob();

      expect(attachmentsClient.update).toHaveBeenCalledTimes(1);
      expect(envelopeOf(attachmentsClient).state).toBe('failed');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'could not write the failed envelope to hunt-coordinator-result-run-1 (run_id=run-1'
        )
      );
    });

    it('logs at warn, not error, when the child already deleted the attachment', async () => {
      const { handler, context, logger, attachmentsClient } = makeDeps();
      attachmentsClient.update.mockRejectedValue(
        createAttachmentNotFoundError({ attachmentId: 'hunt-coordinator-result-run-1' })
      );
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor({ run_id: 'run-1' }), response);
      await flushJob();

      expect(response.ok).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'result attachment hunt-coordinator-result-run-1 is gone, the hunt child gave up'
        )
      );
      expect(logger.error).not.toHaveBeenCalled();
      expect(attachmentsClient.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('the stored result schema covers the service result', () => {
    // Compile-time: `type_check` fails here when the service's HuntCoordinatorResult gains a
    // field the OpenAPI schema lacks, which `validate` would otherwise strip silently.
    it('has no service field that validate would strip', () => {
      const missing: AssertNever<
        FieldsMissingFromSchema<HuntCoordinatorResult, StoredHuntCoordinatorResult>
      > = undefined as never;
      expect(missing).toBeUndefined();
    });
  });

  describe('before the run detaches', () => {
    it('returns a generic 500 and starts nothing when Agent Builder has not started', async () => {
      const { handler, context, logger, attachmentsClient } = makeDeps({
        agentBuilderStarted: false,
      });
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor(), response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'Hunt coordinator failed' },
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('agentBuilder.attachments is not available')
      );
      expect(attachmentsClient.create).not.toHaveBeenCalled();
      expect(huntCoordinatorMock).not.toHaveBeenCalled();
    });

    it('returns a generic 500 and starts nothing when the placeholder cannot be created', async () => {
      const { handler, context, logger, attachmentsClient } = makeDeps();
      attachmentsClient.create.mockRejectedValue(new Error("Conversation 'conv-1' not found"));
      const response = httpServerMock.createResponseFactory();

      await handler(context, requestFor(), response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'Hunt coordinator failed' },
      });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("'conv-1' not found"));
      expect(response.ok).not.toHaveBeenCalled();
      expect(huntCoordinatorMock).not.toHaveBeenCalled();
    });
  });

  describe('SSE entries on the stored result', () => {
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
            validated_esql: 'FROM logs-aws.cloudtrail-default | WHERE true',
            title: 'AssumeRole into high-risk policy boundary',
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

    const resultOf = (attachmentsClient: ReturnType<typeof makeDeps>['attachmentsClient']) => {
      const envelope = envelopeOf(attachmentsClient);
      if (envelope.state !== 'completed') {
        throw new Error(`expected a completed envelope, got ${envelope.state}`);
      }
      return envelope.result;
    };

    it('attaches one entry per corroborated technique on a confirmed hit', async () => {
      huntCoordinatorMock.mockResolvedValue(confirmedResult);
      const { handler, context, attachmentsClient } = makeDeps();

      await handler(context, requestFor(), httpServerMock.createResponseFactory());
      await flushJob();

      const { sse } = resultOf(attachmentsClient);
      expect(sse).toHaveLength(1);
      expect(sse?.[0].attachment_id).toBe(
        buildSseAttachmentId({
          spaceId: 'default',
          reportId: 'report-1',
          techniqueId: 'T1078.004',
        })
      );
    });

    it('scopes attachment ids to the request space', async () => {
      huntCoordinatorMock.mockResolvedValue(confirmedResult);
      const { handler, context, attachmentsClient } = makeDeps({ spaceId: 'hunt-space' });

      await handler(context, requestFor(), httpServerMock.createResponseFactory());
      await flushJob();

      // Re-hunts are idempotent on this id, so a default-space id in another space
      // would overwrite that space's attachment.
      const { sse } = resultOf(attachmentsClient);
      expect(sse?.[0].attachment_id).toBe(
        buildSseAttachmentId({
          spaceId: 'hunt-space',
          reportId: 'report-1',
          techniqueId: 'T1078.004',
        })
      );
      expect(sse?.[0].attachment_id).not.toBe(
        buildSseAttachmentId({
          spaceId: 'default',
          reportId: 'report-1',
          techniqueId: 'T1078.004',
        })
      );
    });

    it('stores no entries for a run that confirmed nothing', async () => {
      const { handler, context, attachmentsClient } = makeDeps();

      await handler(context, requestFor(), httpServerMock.createResponseFactory());
      await flushJob();

      expect(resultOf(attachmentsClient).sse).toBeUndefined();
      expect(resultOf(attachmentsClient).impacted_entities).toBeUndefined();
    });

    it('stores the hosts and users the SSE entries name as impact entities on a confirmed hit', async () => {
      huntCoordinatorMock.mockResolvedValue({
        ...confirmedResult,
        tier1: {
          ...confirmedResult.tier1,
          affected_assets: {
            hosts: [{ name: 'WIN-01', hit_count: 3 }],
            users: [{ name: 'james', hit_count: 2 }],
            services: [{ name: 'arn:aws:iam::1:role/deploy', hit_count: 9 }],
          },
        },
      });
      const { handler, context, attachmentsClient } = makeDeps();

      await handler(context, requestFor(), httpServerMock.createResponseFactory());
      await flushJob();

      expect(resultOf(attachmentsClient).impacted_entities).toEqual([
        { id: 'host:WIN-01', name: 'WIN-01', type: 'host' },
        { id: 'user:james', name: 'james', type: 'user' },
      ]);
    });

    it('stores an empty impact list on a confirmed hit that names no host or user', async () => {
      huntCoordinatorMock.mockResolvedValue(confirmedResult);
      const { handler, context, attachmentsClient } = makeDeps();

      await handler(context, requestFor(), httpServerMock.createResponseFactory());
      await flushJob();

      expect(resultOf(attachmentsClient).impacted_entities).toEqual([]);
    });

    it('stores no entries for a hit on an ad hoc hunt, which has no report to attach to', async () => {
      huntCoordinatorMock.mockResolvedValue(confirmedResult);
      const { handler, context, attachmentsClient } = makeDeps();
      const response = httpServerMock.createResponseFactory();

      await handler(
        context,
        httpServerMock.createKibanaRequest({
          body: { text: 'ad hoc hunt', conversation_id: 'conv-1' },
        }),
        response
      );
      await flushJob();

      expect(response.ok).toHaveBeenCalled();
      expect(resultOf(attachmentsClient).sse).toBeUndefined();
      expect(resultOf(attachmentsClient).impacted_entities).toBeUndefined();
      expect(envelopeOf(attachmentsClient)).not.toHaveProperty('report_id');
    });
  });

  // The hunt-once evidence write is its own route (`write_hunt_evidence.ts`), called by hunt.yaml
  // only after it has polled a completed result -- see that route's doc comment for why it isn't
  // folded in here.
});
