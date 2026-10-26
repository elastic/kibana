/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { RiskScoreStreamOptions } from '../../risk_engine_data_writer';

const integerHeader = (
  headers: KibanaRequest['headers'],
  name: string,
  fallback: number,
  min: number,
  max: number
): number => {
  const value = headers[name];
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || value.length > 8 || !/^\d+$/.test(value)) {
    throw new Error(`${name} must be an integer from ${min} to ${max}`);
  }
  const parsed = Number(value);
  if (parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}`);
  }
  return parsed;
};

/** Reads experimental writer overrides for one synchronous maintainer invocation. */
export const getRiskWriterOptions = (
  headers: KibanaRequest['headers'],
  defaults: RiskScoreStreamOptions
): RiskScoreStreamOptions | undefined => {
  const mode = headers['x-risk-perf-mode'];
  if (mode !== undefined && mode !== 'stream' && mode !== 'baseline') {
    throw new Error('x-risk-perf-mode must be stream or baseline');
  }
  if (mode === 'baseline') {
    if (
      headers['x-risk-perf-flush-bytes'] !== undefined ||
      headers['x-risk-perf-concurrency'] !== undefined
    ) {
      throw new Error('Baseline mode accepts only the mode override');
    }
    return undefined;
  }
  return {
    ...defaults,
    flushBytes: integerHeader(
      headers,
      'x-risk-perf-flush-bytes',
      defaults.flushBytes,
      100_000,
      20_000_000
    ),
    concurrency: integerHeader(headers, 'x-risk-perf-concurrency', defaults.concurrency, 1, 16),
  };
};
