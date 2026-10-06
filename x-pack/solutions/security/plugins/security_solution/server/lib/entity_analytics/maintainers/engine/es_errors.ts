/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';

/**
 * Detects the index-not-found case the engine recovers from gracefully (Step 1
 * runs against `logs-{integration}-{namespace}` data streams that don't exist
 * until the integration ships at least one document).
 *
 * Uses the typed `ResponseError` from `@elastic/elasticsearch` rather than
 * duck-typing two error shapes — the contract is anchored to the client we
 * actually depend on, so a future client upgrade that changes internal
 * representation surfaces as a compile-time signal rather than silent
 * failure.
 */
export const isIndexNotFound = (err: unknown): boolean =>
  err instanceof esErrors.ResponseError && err.body?.error?.type === 'index_not_found_exception';

export const errMsg = (err: unknown): string =>
  err instanceof Error ? err.message : JSON.stringify(err);
