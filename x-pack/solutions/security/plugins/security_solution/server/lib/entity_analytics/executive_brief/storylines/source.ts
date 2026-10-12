/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceStatus } from '../../../../../common/entity_analytics/executive_brief/types';
import type { SnapshotSources } from '../snapshot/context';

const errorType = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const { meta, name } = error as {
    meta?: { body?: { error?: { type?: unknown } } };
    name?: unknown;
  };
  const type = meta?.body?.error?.type;
  if (typeof type === 'string') {
    return type;
  }
  return typeof name === 'string' ? name : undefined;
};

/** Maps a thrown error to the contract's source statuses. */
export const classifyError = (error: unknown): SourceStatus => {
  const type = errorType(error);
  if (type === 'index_not_found_exception') {
    return 'missing_index';
  }
  if (type === 'TimeoutError' || type === 'RequestAbortedError') {
    return 'timeout';
  }
  return 'error';
};

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Like `runSource` from the snapshot context, but classifies missing indices and timeouts, so a
 * tenant without leads or an entity store reads as `missing_index`, not as a generic failure.
 * The fallback is returned only together with the explicit non-ok status.
 */
export const runStorySource = async <T>(
  name: string,
  sources: SnapshotSources,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> => {
  const start = Date.now();
  try {
    const value = await fn();
    sources[name] = { status: 'ok', tookMs: Date.now() - start };
    return value;
  } catch (error) {
    sources[name] = {
      status: classifyError(error),
      tookMs: Date.now() - start,
      message: errorMessage(error),
    };
    return fallback;
  }
};

export const setSourceStatus = (
  sources: SnapshotSources,
  name: string,
  status: SourceStatus,
  message: string,
  tookMs = 0
): void => {
  sources[name] = { status, tookMs, message };
};
