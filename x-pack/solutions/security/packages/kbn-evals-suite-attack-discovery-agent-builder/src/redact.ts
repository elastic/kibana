/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const executionIdPattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export const isExecutionId = (value: unknown): value is string =>
  typeof value === 'string' && executionIdPattern.test(value);

export const redactExecutionIds = (value: unknown): unknown => {
  if (isExecutionId(value)) return '[REDACTED_EXECUTION_ID]';
  if (Array.isArray(value)) return value.map(redactExecutionIds);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        /execution_uuid|execution_id/i.test(key)
          ? '[REDACTED_EXECUTION_ID]'
          : redactExecutionIds(child),
      ])
    );
  }
  return value;
};
