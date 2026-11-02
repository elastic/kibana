/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** One ancestor in the `executionChain` the Workflows engine stores in a child execution's context. */
export interface ExecutionChainHop {
  readonly executionId: string;
  readonly invocation: 'sync' | 'async';
  readonly workflowId: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const toHop = (value: unknown): ExecutionChainHop | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const { executionId, invocation, workflowId } = value;
  return typeof executionId === 'string' &&
    executionId.length > 0 &&
    typeof workflowId === 'string' &&
    (invocation === 'sync' || invocation === 'async')
    ? { executionId, invocation, workflowId }
    : undefined;
};

/**
 * Reads the ancestors stored in a child execution's `context.executionChain`, root first and
 * direct parent last. Returns `undefined` unless every hop is well formed, no execution id repeats,
 * and the chain has between 1 and `maxHops` hops.
 */
export const parseExecutionChain = (
  context: Record<string, unknown> | undefined,
  maxHops: number
): readonly ExecutionChainHop[] | undefined => {
  const chain = context?.executionChain;
  if (!Array.isArray(chain) || chain.length === 0 || chain.length > maxHops) {
    return undefined;
  }
  const hops = chain.map(toHop);
  const ids = new Set(hops.map((hop) => hop?.executionId));
  return hops.every((hop): hop is ExecutionChainHop => hop !== undefined) &&
    ids.size === hops.length
    ? hops
    : undefined;
};
