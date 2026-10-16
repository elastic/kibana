/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperationResult } from '../models/operation_result';
import type { RepositoryRevisionRequest, ResolvedRepository } from '../models/repository_codec';

/** Resolves a requested revision to the immutable bare-repository snapshot. */
export interface RepositoryResolver {
  /** Resolves a revision through the configured repository transport. */
  resolve(request: RepositoryRevisionRequest): Promise<OperationResult<ResolvedRepository>>;
}
