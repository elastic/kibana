/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';

import { findAttackDiscoveryAlerts } from '../find_attack_discovery_alerts';

export interface ResolveReadableAttackDiscoveryAlertIdsParams {
  /**
   * Attack Discovery ids the response would correlate to. Empty ids are dropped and duplicates
   * collapsed, so an uncorrelated row costs nothing; when nothing is left, no request is made.
   */
  correlationIds: readonly string[];
  /** Core's HTTP start contract, used to call the public find route as the caller. */
  http: HttpServiceStart;
  /** The incoming request, so the discoveries resolve as the calling user (S3). */
  request: KibanaRequest;
  /** Space id resolved from the request (S9); never a client value, never `'*'`. */
  spaceId: string;
}

/**
 * Resolve **which** of a response's correlated Attack Discovery ids the caller can actually read,
 * via the single `_find?ids=` round-trip {@link findAttackDiscoveryAlerts} performs as the calling
 * user (security finding S3). Every list route that exposes discovery-derived content — the runs
 * list and the proposals queue — filters its rows against this set, so one caller can never see a
 * row assembled from a discovery another user owns.
 *
 * The empty-input short circuit is load-bearing, not an optimization: a response with no
 * correlations must not issue an Attack Discovery request at all.
 */
export const resolveReadableAttackDiscoveryAlertIds = async ({
  correlationIds,
  http,
  request,
  spaceId,
}: ResolveReadableAttackDiscoveryAlertIdsParams): Promise<Set<string>> => {
  const ids = Array.from(new Set(correlationIds.filter((id) => id.length > 0)));

  if (ids.length === 0) {
    return new Set();
  }

  const alerts = await findAttackDiscoveryAlerts({ http, ids, request, spaceId });

  return new Set(alerts.map(({ id }) => id));
};
