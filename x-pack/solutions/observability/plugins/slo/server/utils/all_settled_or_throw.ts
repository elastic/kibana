/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Waits for every promise to settle, then rethrows the first rejection in input order.
 */
export const allSettledOrThrow = async (
  promises: ReadonlyArray<Promise<unknown>>
): Promise<void> => {
  const results = await Promise.allSettled(promises);
  const rejected = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  );
  if (rejected) {
    throw rejected.reason;
  }
};
