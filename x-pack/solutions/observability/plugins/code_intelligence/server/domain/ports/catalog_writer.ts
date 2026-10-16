/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatalogWriteRequest, CatalogWriteResult } from '../models/catalog_document_codec';
import type { OperationResult } from '../models/operation_result';

/** Identifies the only documents of one repository that survive a prune. */
export interface CatalogPruneRequest {
  readonly repository: string;
  /** Must be non-empty; an empty keep set is rejected rather than deleting the whole repository. */
  readonly keepIds: readonly string[];
}

/** Reports how many stale documents a prune removed. */
export interface CatalogPruneResult {
  readonly deleted: number;
}

/** Persists documents together with their explicit validation outcomes. */
export interface CatalogWriter {
  /** Persists documents with their associated validation outcomes. */
  write(requests: readonly CatalogWriteRequest[]): Promise<OperationResult<CatalogWriteResult>>;
  /** Deletes every document of the repository whose ID is not in the keep set. */
  prune(request: CatalogPruneRequest): Promise<OperationResult<CatalogPruneResult>>;
}
