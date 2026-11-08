/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const toId = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

/**
 * Reads a persisted execution's parent execution id: the flat `parentWorkflowExecutionId` a child
 * is created with, or else the nested `parent.executionId` the engine's terminal save merges in
 * beside it.
 */
export const getParentExecutionId = (
  context: Record<string, unknown> | undefined
): string | undefined => {
  const flat = toId(context?.parentWorkflowExecutionId);
  if (flat) {
    return flat;
  }
  const parent = context?.parent;
  return isRecord(parent) ? toId(parent.executionId) : undefined;
};
