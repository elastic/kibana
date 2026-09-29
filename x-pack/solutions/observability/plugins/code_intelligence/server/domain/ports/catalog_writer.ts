/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatalogWriteRequest, CatalogWriteResult } from '../models/catalog_document_codec';
import type { OperationResult } from '../models/operation_result';

/** Persists documents together with their explicit validation outcomes. */
export interface CatalogWriter {
  /** Persists documents with their associated validation outcomes. */
  write(requests: readonly CatalogWriteRequest[]): Promise<OperationResult<CatalogWriteResult>>;
}
