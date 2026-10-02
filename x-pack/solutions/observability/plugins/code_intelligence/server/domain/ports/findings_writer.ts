/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindingDocument, FindingsWriteResult } from '../models/finding_document_codec';
import type { OperationResult } from '../models/operation_result';

/** Identifies the findings of one repository that survive a prune. */
export interface FindingsPruneRequest {
  readonly repository: string;
  /**
   * May be empty: a complete extraction that filed no findings removes every earlier finding of
   * the repository, so a fixed source line does not stay open forever. Callers only prune after a
   * fully classified run.
   */
  readonly keepIds: readonly string[];
}

/** Reports how many stale findings a prune removed. */
export interface FindingsPruneResult {
  readonly deleted: number;
}

/** Persists findings for human review while preserving the review state of existing ones. */
export interface FindingsWriter {
  /** Upserts findings; an existing document keeps its `status` and `createdAt`. */
  write(documents: readonly FindingDocument[]): Promise<OperationResult<FindingsWriteResult>>;
  /** Deletes every finding of the repository whose ID is not in the keep set. */
  prune(request: FindingsPruneRequest): Promise<OperationResult<FindingsPruneResult>>;
}
