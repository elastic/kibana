/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withTimeout as promiseWithTimeout } from '@kbn/std';

const CANCELLED_MESSAGE = 'Cancelled with the workflow execution';

/**
 * Runs `work` with a signal that aborts after `ms`, so the work can stop itself rather than being
 * abandoned while it keeps running.
 */
export const withTimeout = async <T>(
  work: (signal: AbortSignal) => Promise<T>,
  ms: number,
  message: string,
  /** The workflow's signal: cancelling the execution aborts the work too. */
  parentSignal?: AbortSignal
): Promise<T> => {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (parentSignal?.aborted) controller.abort();
  else parentSignal?.addEventListener('abort', onParentAbort, { once: true });

  const promise = work(controller.signal);
  // Callers that ignore the signal still settle late. Swallow that rejection so it cannot surface
  // as an unhandledRejection and take Kibana down after we have already rejected below.
  void promise.catch(() => undefined);

  let onCancel: (() => void) | undefined;
  const cancelled = parentSignal
    ? new Promise<never>((_, reject) => {
        onCancel = () => reject(new Error(CANCELLED_MESSAGE));
        if (parentSignal.aborted) onCancel();
        else parentSignal.addEventListener('abort', onCancel, { once: true });
      })
    : undefined;

  try {
    const outcome = await promiseWithTimeout({
      promise: cancelled ? Promise.race([promise, cancelled]) : promise,
      timeoutMs: ms,
    });
    if (outcome.timedout) {
      controller.abort();
      throw new Error(message);
    }
    return outcome.value;
  } finally {
    if (onCancel) parentSignal?.removeEventListener('abort', onCancel);
    parentSignal?.removeEventListener('abort', onParentAbort);
  }
};
