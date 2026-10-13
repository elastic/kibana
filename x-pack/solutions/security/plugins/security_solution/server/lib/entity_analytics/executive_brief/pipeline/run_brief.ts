/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import {
  ChatCompletionErrorCode,
  InferenceTaskErrorCode,
  isInferenceError,
} from '@kbn/inference-common';
import { BRIEF_HEARTBEAT_INTERVAL_MS } from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefErrorCode,
  BriefJobStage,
  BriefParams,
} from '../../../../../common/entity_analytics/executive_brief/document';
import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { hasFindings } from '../../../../../common/entity_analytics/executive_brief/evidence';
import type { ComposeVerifiedBrief, ComposeVerifiedBriefResult } from '../composition/types';
import { BriefCompositionError } from '../composition/types';
import type { BriefSignal, RunSignals, SignalContext, SignalOutcome } from '../signals/types';
import type { BriefStore } from '../store/brief_store';
import type { BriefCompletedEvent, BriefTelemetry } from '../telemetry/types';

const MAX_ERROR_MESSAGE_LENGTH = 1000;

export type BriefAbortCode = 'timeout' | 'interrupted' | 'superseded';

/** Abort reason used by the task runner, and by runBrief itself when the job is superseded. */
export class BriefAbortReason extends Error {
  constructor(public readonly code: BriefAbortCode, message: string) {
    super(message);
    this.name = 'BriefAbortReason';
  }
}

export interface BriefError {
  code: BriefErrorCode;
  message: string;
}

/** The signal engine and composition, injected so runBrief doesn't depend on the task runner. */
export interface RunBriefDeps {
  runSignals: RunSignals;
  signals: readonly BriefSignal[];
  composeVerifiedBrief: ComposeVerifiedBrief;
}

export interface RunBriefParams {
  docId: string;
  jobId: string;
  params: BriefParams;
  store: Pick<BriefStore, 'markRunning' | 'heartbeat' | 'setStage' | 'completeJob' | 'failJob'>;
  /** Scoped to the requesting user. */
  signalContext: SignalContext;
  /** Bound to `params.connector_id`. */
  inferenceClient: BoundInferenceClient;
  abortSignal: AbortSignal;
  logger: Logger;
  telemetry: BriefTelemetry;
  deps: RunBriefDeps;
  heartbeatIntervalMs?: number;
}

export type RunBriefOutcome =
  | { status: 'succeeded' }
  | { status: 'failed'; error: BriefError }
  /** The job was replaced, deleted or finished elsewhere; nothing was written. */
  | { status: 'superseded' };

const truncate = (message: string): string =>
  message.length > MAX_ERROR_MESSAGE_LENGTH
    ? `${message.slice(0, MAX_ERROR_MESSAGE_LENGTH)}…`
    : message;

const LLM_OUTPUT_CODES: ReadonlySet<string> = new Set([
  ChatCompletionErrorCode.ToolValidationError,
  ChatCompletionErrorCode.ToolNotFoundError,
  ChatCompletionErrorCode.OutputTokenLimitReachedError,
  ChatCompletionErrorCode.ContextLengthExceededError,
]);

/** Maps any failure to a job error code; aborts take precedence over the error they caused. */
export const toBriefError = (error: unknown, abortSignal?: AbortSignal): BriefError => {
  const message = truncate(error instanceof Error ? error.message : String(error));

  if (abortSignal?.aborted) {
    const { reason } = abortSignal;
    if (reason instanceof BriefAbortReason && reason.code !== 'superseded') {
      return { code: reason.code, message: reason.message };
    }
    return { code: 'interrupted', message: 'The brief generation was interrupted.' };
  }
  if (error instanceof BriefCompositionError) {
    return { code: error.code, message };
  }
  if (isInferenceError(error)) {
    if (LLM_OUTPUT_CODES.has(error.code)) {
      return { code: 'llm_output', message };
    }
    if (error.code === InferenceTaskErrorCode.abortedError) {
      return { code: 'timeout', message };
    }
    return { code: 'llm_error', message };
  }
  return { code: 'internal', message };
};

const isSuperseded = (signal: AbortSignal): boolean =>
  signal.aborted &&
  signal.reason instanceof BriefAbortReason &&
  signal.reason.code === 'superseded';

/** Accumulates wall-clock time per stage; a repair can move compose → verify → compose. */
const createStageClock = () => {
  const durations: Partial<Record<BriefJobStage, number>> = {};
  let current: { stage: BriefJobStage; since: number } | undefined;

  const stop = (): void => {
    if (current) {
      durations[current.stage] = (durations[current.stage] ?? 0) + Date.now() - current.since;
      current = undefined;
    }
  };

  return {
    enter: (stage: BriefJobStage): void => {
      stop();
      current = { stage, since: Date.now() };
    },
    current: (): BriefJobStage | undefined => current?.stage,
    stop,
    durations,
  };
};

/** What the run produced so far; becomes the completion event however the run ends. */
interface RunProgress {
  evidence?: Evidence;
  outcomes?: SignalOutcome[];
  result?: ComposeVerifiedBriefResult;
  /** Usage spent by a composition that then failed. */
  failedTokens?: ComposeVerifiedBriefResult['tokens'];
}

const toCompletedEvent = ({
  outcome,
  range,
  startedAtMs,
  stageDurationsMs,
  progress: { evidence, outcomes, result, failedTokens },
}: {
  outcome: RunBriefOutcome;
  range: string;
  startedAtMs: number;
  stageDurationsMs: Partial<Record<BriefJobStage, number>>;
  progress: RunProgress;
}): BriefCompletedEvent => {
  const succeeded = outcome.status === 'succeeded';
  const usedTokens = result?.tokens ?? failedTokens;
  let errorCode: BriefErrorCode | undefined;
  if (outcome.status === 'failed') {
    errorCode = outcome.error.code;
  } else if (outcome.status === 'superseded') {
    errorCode = 'interrupted';
  }

  return {
    outcome: succeeded ? 'succeeded' : 'failed',
    ...(errorCode ? { errorCode } : {}),
    range,
    ...(result?.model ? { model: result.model } : {}),
    durationMs: Date.now() - startedAtMs,
    stageDurationsMs,
    signals: (outcomes ?? []).map(({ id, status, took, factCount }) => ({
      id,
      status,
      durationMs: took,
      factCount,
    })),
    entityCount: evidence ? Object.keys(evidence.entities).length : 0,
    factCount: evidence?.facts.length ?? 0,
    ...(usedTokens
      ? { tokens: { prompt: usedTokens.prompt, completion: usedTokens.completion } }
      : {}),
    repaired: result?.verification.repaired ?? false,
    levelsLowered: result?.verification.lowered ?? 0,
    verificationDropped: result?.verification.dropped ?? {},
  };
};

/**
 * Runs one brief job and records progress on its document: running → gather (signals) →
 * compose → verify → succeeded, or failed with an error code. Heartbeats every 10 s; if a
 * heartbeat or stage write finds the job superseded, the run is aborted without writing.
 * With no findings the AI is not called: the job succeeds with the signal coverage only.
 */
export const runBrief = async ({
  docId,
  jobId,
  params,
  store,
  signalContext,
  inferenceClient,
  abortSignal,
  logger,
  telemetry,
  deps,
  heartbeatIntervalMs = BRIEF_HEARTBEAT_INTERVAL_MS,
}: RunBriefParams): Promise<RunBriefOutcome> => {
  const ids = { docId, jobId };
  const jobController = new AbortController();
  const forwardAbort = () => jobController.abort(abortSignal.reason);
  if (abortSignal.aborted) {
    forwardAbort();
  } else {
    abortSignal.addEventListener('abort', forwardAbort, { once: true });
  }
  const { signal } = jobController;

  const supersede = () => {
    if (!signal.aborted) {
      jobController.abort(
        new BriefAbortReason('superseded', `Executive brief job ${jobId} was superseded`)
      );
    }
  };

  const stageClock = createStageClock();
  const progress: RunProgress = {};

  const enterStage = async (stage: BriefJobStage): Promise<void> => {
    if (stageClock.current() === stage) {
      return;
    }
    stageClock.enter(stage);
    if (!(await store.setStage({ ...ids, stage }))) {
      supersede();
    }
  };

  const generate = async (): Promise<RunBriefOutcome> => {
    signal.throwIfAborted();
    stageClock.enter('gather');
    const { evidence, outcomes } = await telemetry.withSpan('gather', {}, () =>
      deps.runSignals(signalContext, deps.signals, { abortSignal: signal, telemetry })
    );
    progress.evidence = evidence;
    progress.outcomes = outcomes;

    signal.throwIfAborted();
    if (!hasFindings(evidence)) {
      stageClock.stop();
      logger.debug(`Executive brief job ${jobId} found nothing; skipping composition`);
      const completed = await store.completeJob({ ...ids, result: { evidence, params } });
      return completed ? { status: 'succeeded' } : { status: 'superseded' };
    }

    await enterStage('compose');
    // Verification runs in its own span inside composeVerifiedBrief.
    const result = await telemetry.withSpan('compose', {}, () =>
      deps.composeVerifiedBrief({
        inferenceClient,
        evidence,
        signals: outcomes,
        timeRange: { from: params.from, to: params.to, range: params.range },
        abortSignal: signal,
        logger,
        onStage: enterStage,
        telemetry,
      })
    );
    stageClock.stop();
    progress.result = result;
    telemetry.recordTokens(result.tokens);
    telemetry.recordVerificationDropped(result.verification.dropped);

    signal.throwIfAborted();
    const completed = await store.completeJob({
      ...ids,
      result: { evidence, params, composed: result },
    });
    return completed ? { status: 'succeeded' } : { status: 'superseded' };
  };

  const recordFailure = async (error: unknown): Promise<RunBriefOutcome> => {
    if (isSuperseded(signal)) {
      logger.debug(`Executive brief job ${jobId} was superseded; not recording a failure`);
      return { status: 'superseded' };
    }

    if (error instanceof BriefCompositionError && error.tokens) {
      progress.failedTokens = error.tokens;
      telemetry.recordTokens(error.tokens);
    }
    const briefError = toBriefError(error, signal);
    logger.error(`Executive brief job ${jobId} failed (${briefError.code}): ${briefError.message}`);
    try {
      const recorded = await store.failJob({ ...ids, error: briefError });
      return recorded ? { status: 'failed', error: briefError } : { status: 'superseded' };
    } catch (failError) {
      logger.error(
        `Could not record the failure of executive brief job ${jobId}: ${failError.message}`
      );
      return { status: 'failed', error: briefError };
    }
  };

  let heartbeatTimer: NodeJS.Timeout | undefined;
  try {
    let running: boolean;
    try {
      running = await store.markRunning(ids);
    } catch (error) {
      return await recordFailure(error);
    }
    if (!running) {
      logger.debug(`Executive brief job ${jobId} is no longer current; skipping`);
      return { status: 'superseded' };
    }

    const startedAtMs = Date.now();
    telemetry.jobStarted();
    heartbeatTimer = setInterval(() => {
      store
        .heartbeat(ids)
        .then((current) => {
          if (!current) {
            supersede();
          }
        })
        .catch((error) => {
          logger.warn(`Executive brief heartbeat failed for job ${jobId}: ${error.message}`);
        });
    }, heartbeatIntervalMs);

    let outcome: RunBriefOutcome;
    try {
      outcome = await telemetry.withSpan('generate', { range: params.range }, generate);
    } catch (error) {
      stageClock.stop();
      outcome = await recordFailure(error);
    }

    telemetry.jobFinished(
      toCompletedEvent({
        outcome,
        range: params.range,
        startedAtMs,
        stageDurationsMs: stageClock.durations,
        progress,
      })
    );
    return outcome;
  } finally {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }
    abortSignal.removeEventListener('abort', forwardAbort);
  }
};
