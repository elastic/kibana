/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { errors } from '@elastic/elasticsearch';

/**
 * Handles errors from has-data Elasticsearch search requests.
 * Returns true if the error is a transient "no shards available" condition
 * (which should be treated as hasData: false), or throws a Boom error otherwise.
 */
export function isNoShardsAvailableError(error: unknown): boolean {
  if (!(error instanceof errors.ResponseError)) {
    return false;
  }

  const body = error.body as
    | { error?: { type?: string; root_cause?: Array<{ type?: string }> } }
    | undefined;
  const errorType = body?.error?.type;
  const rootCauseType = body?.error?.root_cause?.[0]?.type;

  if (
    errorType === 'search_phase_execution_exception' &&
    rootCauseType === 'no_shard_available_action_exception'
  ) {
    return true;
  }

  return false;
}

export function throwHasDataSearchError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  throw Boom.internal(`Elasticsearch responded with an error. ${message}`);
}
