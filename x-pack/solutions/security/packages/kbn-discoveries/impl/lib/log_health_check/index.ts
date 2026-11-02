/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

const formatValue = (value: unknown): string => {
  if (value === undefined) {
    return 'undefined';
  }
  return JSON.stringify(value);
};

const formatPreconditions = (preconditions: Record<string, unknown>): string => {
  const entries = Object.entries(preconditions);

  if (entries.length === 0) {
    return '(none)';
  }

  return entries.map(([key, value]) => `${key}=${formatValue(value)}`).join(', ');
};

/**
 * Logs a DEBUG-level health check message that summarizes the preconditions
 * verified before an orchestration step executes. Uses lazy evaluation so
 * the formatting work is skipped entirely when debug logging is disabled.
 */
export const logHealthCheck = (
  logger: Logger,
  step: string,
  preconditions: Record<string, unknown>
): void => {
  logger.debug(() => `Health check [${step}]: ${formatPreconditions(preconditions)}`);
};
