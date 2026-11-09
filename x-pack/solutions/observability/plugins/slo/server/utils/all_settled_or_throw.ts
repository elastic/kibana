/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAbortError } from './with_deadline';

/**
 * Waits for every promise to settle, then rethrows the first rejection in input order, preferring one that is not an abort.
 */
export const allSettledOrThrow = async (
  promises: ReadonlyArray<Promise<unknown>>
): Promise<void> => {
  const results = await Promise.allSettled(promises);
  const rejections = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  );
  const rejected = rejections.find(({ reason }) => !isAbortError(reason)) ?? rejections[0];
  if (rejected) {
    throw rejected.reason;
  }
};
