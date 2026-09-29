/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperationResult } from './operation_result';

/** Enforces exactly one known classification result for every submitted candidate. */
export const validateClassificationCompleteness = <
  Candidate extends { readonly id: string },
  Result extends { readonly id: string }
>(
  candidates: readonly Candidate[],
  results: readonly Result[]
): OperationResult<readonly Result[]> => {
  /** Tracks submitted IDs as the trusted classification membership set. */
  const expected = new Set(candidates.map((candidate) => candidate.id));
  /** Tracks returned IDs for duplicate, missing, and unknown-ID checks. */
  const actual = new Set(results.map((result) => result.id));
  if (actual.size !== results.length || results.length !== candidates.length) {
    return {
      error: {
        code: 'incomplete_classification',
        message: 'Workflow must return exactly 1 result per candidate.',
        retryable: false,
      },
      status: 'failure',
    };
  }
  return [...actual].every((id) => expected.has(id))
    ? { status: 'success', value: results }
    : {
        error: {
          code: 'unknown_classification_id',
          message: 'Workflow returned a result for an unknown candidate.',
          retryable: false,
        },
        status: 'failure',
      };
};
