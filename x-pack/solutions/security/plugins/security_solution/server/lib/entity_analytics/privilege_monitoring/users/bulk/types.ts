/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Either } from 'fp-ts/Either';

export interface BulkPrivMonUser {
  name: string;
}

export interface Batch {
  uploaded: Array<Either<string, BulkPrivMonUser>>;
  existingUsers: Record<string, string>;
}

export interface Options {
  flushBytes: number;
  retries: number;
}

export interface BulkProcessingError {
  message: string;
  username?: string;
}

export interface BulkProcessingResults {
  failed: number;
  successful: number;
  errors: BulkProcessingError[];
  batch: Batch;
}
