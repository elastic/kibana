/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceWriteConflictReason } from '@kbn/significant-events-schema';
import { isRetryableSourceWriteConflict } from '@kbn/significant-events-schema';
import { StatusError } from './status_error';

/** A 409 for a write to a source's knowledge, carrying why it was refused in `data.reason`. */
export class SourceWriteConflictError extends StatusError {
  constructor(public readonly reason: SourceWriteConflictReason, message: string) {
    super(message, 409);
    this.data = { reason };
  }
}

/** The reason of a source write conflict, if the error is one. */
export const getSourceWriteConflictReason = (
  error: unknown
): SourceWriteConflictReason | undefined =>
  error instanceof SourceWriteConflictError ? error.reason : undefined;

/** What an agent needs to tell "try again later" from "give up", empty for any other error. */
export const getSourceWriteConflictMetadata = (
  error: unknown
): { reason: SourceWriteConflictReason; retryable: boolean } | undefined => {
  const reason = getSourceWriteConflictReason(error);
  return reason === undefined
    ? undefined
    : { reason, retryable: isRetryableSourceWriteConflict(reason) };
};
