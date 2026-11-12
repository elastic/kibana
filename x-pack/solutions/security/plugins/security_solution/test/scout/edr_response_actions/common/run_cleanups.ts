/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A teardown step; `undefined` entries are skipped so optional steps can be listed inline. */
export type CleanupStep = (() => Promise<unknown> | undefined) | undefined;

/**
 * Runs every cleanup step in order, even when an earlier one fails. A single failure is
 * rethrown as is; several are rethrown together as an `AggregateError` with `errorMessage`.
 */
export const runCleanups = async (
  steps: readonly CleanupStep[],
  errorMessage: string
): Promise<void> => {
  const failures: unknown[] = [];
  for (const step of steps) {
    try {
      await step?.();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length === 1) {
    throw failures[0];
  }
  if (failures.length > 1) {
    throw new AggregateError(failures, errorMessage);
  }
};
