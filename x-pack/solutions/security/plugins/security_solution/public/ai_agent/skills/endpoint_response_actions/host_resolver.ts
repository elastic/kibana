/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostRef } from './types';

/**
 * Resolve hostname to Fleet agent ID.
 * Exact match → single result.
 * Fuzzy match → clarification with top-3 candidates.
 * No match → null.
 */
export async function resolveHost(hostname: string): Promise<HostRef | null> {
  // TODO: implement Fleet API query
  if (!hostname || hostname.trim() === '') {
    return null;
  }
  throw new Error('Not implemented');
}
