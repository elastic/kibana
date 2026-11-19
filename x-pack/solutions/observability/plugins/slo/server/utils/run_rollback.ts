/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withTimeoutSignal } from './with_deadline';

export const ROLLBACK_DEADLINE_MS = 30_000;

export type RollbackOperation = (signal: AbortSignal) => Promise<unknown>;

/**
 * Runs the rollback operations in parallel under the rollback deadline, then the final operation, reporting every failure.
 */
export const runRollback = async ({
  operations,
  finalOperation,
  onError,
}: {
  operations: readonly RollbackOperation[];
  finalOperation?: () => Promise<unknown>;
  onError: (error: Error) => void;
}): Promise<void> => {
  const results = await withTimeoutSignal(ROLLBACK_DEADLINE_MS, (signal) =>
    Promise.allSettled(operations.map(async (operation) => operation(signal)))
  );

  results.forEach((result) => {
    if (result.status === 'rejected') {
      onError(result.reason);
    }
  });

  if (!finalOperation) {
    return;
  }

  try {
    await finalOperation();
  } catch (err) {
    onError(err);
  }
};
