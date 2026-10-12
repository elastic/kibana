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
  BriefParams,
} from '../../../../../common/entity_analytics/executive_brief/document';
import type { ComposeVerifiedBrief } from '../composition/types';
import { BriefCompositionError } from '../composition/types';
import type { BriefSignal, RunSignals, SignalContext } from '../signals/types';
import type { BriefStore } from '../store/brief_store';

const MAX_ERROR_MESSAGE_LENGTH = 1000;

export type BriefAbortCode = 'timeout' | 'interrupted' | 'superseded';

/** Abort reason used by the executor (and by runBrief itself when the job is superseded). */
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

/** The signal engine and composition, injected so runBrief is executor-agnostic and testable. */
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

/**
 * Runs one brief job and records progress on its document: running → gather (signals) →
 * compose → verify → succeeded, or failed with an error code. Heartbeats every 10 s; if a
 * heartbeat or stage write finds the job superseded, the run is aborted without writing.
 * Composition runs even when the evidence has no facts (the AI reports a quiet tenant).
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

  let heartbeatTimer: NodeJS.Timeout | undefined;

  try {
    if (!(await store.markRunning(ids))) {
      logger.debug(`Executive brief job ${jobId} is no longer current; skipping`);
      return { status: 'superseded' };
    }

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

    signal.throwIfAborted();
    const evidence = await deps.runSignals(signalContext, deps.signals, { abortSignal: signal });

    signal.throwIfAborted();
    const result = await deps.composeVerifiedBrief({
      inferenceClient,
      evidence,
      timeRange: { from: params.from, to: params.to, range: params.range },
      abortSignal: signal,
      logger,
      onStage: async (stage) => {
        if (!(await store.setStage({ ...ids, stage }))) {
          supersede();
        }
      },
    });

    signal.throwIfAborted();
    const completed = await store.completeJob({ ...ids, result: { ...result, evidence, params } });
    return completed ? { status: 'succeeded' } : { status: 'superseded' };
  } catch (error) {
    if (isSuperseded(signal)) {
      logger.debug(`Executive brief job ${jobId} was superseded; not recording a failure`);
      return { status: 'superseded' };
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
  } finally {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }
    abortSignal.removeEventListener('abort', forwardAbort);
  }
};
