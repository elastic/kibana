/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { separate } from 'fp-ts/Array';
import type { BulkProcessingResults, BulkPrivMonUser, BulkBatchProcessingResults } from './types';

export interface Accumulator {
  failed: number;
  successful: number;
  errors: BulkProcessingResults['errors'];
  users: BulkPrivMonUser[];
}

export const accumulateUpsertResults = (
  acc: Accumulator,
  processed: BulkBatchProcessingResults
): BulkProcessingResults => {
  const { left: errors, right: users } = separate(processed.batch.uploaded);

  return {
    users: acc.users.concat(users),
    errors: acc.errors.concat(errors),
    failed: acc.failed + processed.failed,
    successful: acc.successful + processed.successful,
  };
};
