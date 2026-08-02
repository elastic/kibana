/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_FIND,
  type AttackDiscoveryApiAlert,
  type AttackDiscoveryFindResponse,
} from '@kbn/elastic-assistant-common';

import { scopedSelfGet } from '../scoped_self_get';

/**
 * Upper bound on how many Attack Discovery alerts the conversations list intersects against.
 * The Agent Builder conversations list is itself capped at 1000 with no pagination, so pulling
 * more AD alerts than that could never surface additional conversations.
 */
export const FIND_ATTACK_DISCOVERY_ALERTS_MAX = 1000;

export interface FindAttackDiscoveryAlertsParams {
  /** Core's HTTP start contract. */
  http: HttpServiceStart;
  /**
   * Optional Attack Discovery alert ids to resolve. When provided (the `_derive` path), only the
   * matching discoveries are returned. When omitted (the conversations-list path), the space's
   * discoveries are returned up to {@link FIND_ATTACK_DISCOVERY_ALERTS_MAX}.
   */
  ids?: string[];
  /** The incoming request, used to resolve the discoveries as the calling user (S3). */
  request: KibanaRequest;
  /** Space id resolved from the request (S9). */
  spaceId: string;
}

/**
 * Resolve Attack Discovery 2.0 alerts **as the calling user** via `GET /api/attack_discovery/_find`
 * (security finding S3). That public route enforces `ATTACK_DISCOVERY_API_ACTION_ALL`,
 * `ALERTS_API_READ` and the per-space index privileges, so a caller who cannot read a discovery
 * gets an empty result here — never the internal user's view. Returns `[]` for any non-2xx response
 * (e.g. a `403` from the target route), keeping existence non-observable at the PND boundary.
 *
 * `include_all_authors` lifts only the author filter. Privilege still applies: a caller without
 * `_find` rights still gets `[]`. Without it, a privileged user who did not author the discovery
 * (workflow `kibana.request`, `elastic` looking at `test_user` ADs) would empty the proposals
 * queue, 404 `_derive`, and drop tactics on the coverage-gap claim.
 */
export const findAttackDiscoveryAlerts = async ({
  http,
  ids,
  request,
  spaceId,
}: FindAttackDiscoveryAlertsParams): Promise<AttackDiscoveryApiAlert[]> => {
  const { body } = await scopedSelfGet<AttackDiscoveryFindResponse>({
    http,
    path: ATTACK_DISCOVERY_FIND,
    query: {
      include_all_authors: true,
      ...(ids != null ? { ids } : {}),
      per_page: FIND_ATTACK_DISCOVERY_ALERTS_MAX,
    },
    request,
    spaceId,
    version: API_VERSIONS.public.v1,
  });

  return body?.data ?? [];
};
