/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

/**
 * Handles errors from has-data Elasticsearch search requests.
 * Returns true if the error is a transient "no shards available" condition
 * (which should be treated as hasData: false), or throws a Boom error otherwise.
 */
export function isNoShardsAvailableError(error: any): boolean {
  const errorType = error?.meta?.body?.error?.type;
  const rootCauseType = error?.meta?.body?.error?.root_cause?.[0]?.type;

  if (
    errorType === 'search_phase_execution_exception' &&
    rootCauseType === 'no_shard_available_action_exception'
  ) {
    return true;
  }

  return false;
}

export function throwHasDataSearchError(error: any): never {
  throw Boom.internal(`Elasticsearch responded with an error. ${error.message}`);
}
