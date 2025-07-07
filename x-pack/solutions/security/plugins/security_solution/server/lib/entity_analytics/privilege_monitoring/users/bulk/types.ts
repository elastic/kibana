/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Either } from 'fp-ts/Either';

export interface BulkPrivMonUser {
  username: string;
  index: number;
}

export interface Batch {
  uploaded: Array<Either<BulkProcessingError, BulkPrivMonUser>>;
  existingUsers: Record<string, string>;
}

export interface Options {
  flushBytes: number;
  retries: number;
}

export interface BulkProcessingError {
  message: string;
  username: string | null;
  index: number | null;
}

export interface BulkBatchProcessingResults {
  failed: number;
  successful: number;
  errors: BulkProcessingError[];
  batch: Batch;
}

export interface BulkProcessingResults {
  users: BulkPrivMonUser[];
  errors: BulkProcessingError[];
  failed: number;
  successful: number;
}
