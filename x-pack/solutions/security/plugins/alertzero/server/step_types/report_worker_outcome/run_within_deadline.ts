/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RunWithinDeadlineParams<T> {
  /** The caller's signal; aborting it also aborts the signal `task` receives. */
  abortSignal: AbortSignal;
  deadlineMs: number;
  /** The result once `deadlineMs` elapses before `task` settles. */
  onDeadline: () => T;
  /** Receives a signal that aborts with `abortSignal` or at the deadline. */
  task: (abortSignal: AbortSignal) => Promise<T>;
}

/**
 * Settles like `task`, or with `onDeadline()` once `deadlineMs` elapses first. At the deadline the
 * signal `task` received aborts, but `task` itself keeps running, so it must check that signal
 * before any side effect.
 */
export const runWithinDeadline = async <T>({
  abortSignal,
  deadlineMs,
  onDeadline,
  task,
}: RunWithinDeadlineParams<T>): Promise<T> => {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (abortSignal.aborted) {
    abort();
  } else {
    abortSignal.addEventListener('abort', abort, { once: true });
  }
  let timer: NodeJS.Timeout | undefined;
  const expired = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      abort();
      resolve(onDeadline());
    }, deadlineMs);
  });
  try {
    return await Promise.race([task(controller.signal), expired]);
  } finally {
    clearTimeout(timer);
    abortSignal.removeEventListener('abort', abort);
  }
};
