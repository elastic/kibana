/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { AuthenticatedUser } from '@kbn/core-security-common';

import { ATTACK_DISCOVERY_EVENT_PROVIDER } from '../../../../../common/constants';
import { getAttackDiscoveryGenerationsAggs } from '../get_attack_discovery_generations_aggs';

export const DEFAULT_END = 'now';
export const DEFAULT_START = 'now-24h';

/**
 * Returns an Elasticsearch query to search the event log for the authenticated
 * users' generations
 * */
export const getAttackDiscoveryGenerationsQuery = ({
  authenticatedUser,
  end = DEFAULT_END,
  eventLogIndex,
  scheduled,
  size,
  start = DEFAULT_START,
  spaceId,
}: {
  authenticatedUser: AuthenticatedUser;
  end?: string;
  eventLogIndex: string;
  /**
   * When provided, filters by generation source:
   * - `true` → only scheduled generations (event.category: scheduled)
   * - `false` → only ad-hoc generations (event.category: interactive or action)
   * - `undefined` → all generations (no category filter)
   */
  scheduled?: boolean;
  size: number;
  start?: string;
  spaceId: string;
}): estypes.SearchRequest => ({
  // query metadata
  allow_no_indices: true,
  index: [eventLogIndex],
  ignore_unavailable: true,
  _source: false,
  size: 0,
  // aggregations group the generation events by their execution UUID
  aggs: {
    ...getAttackDiscoveryGenerationsAggs(size).aggs,
  },
  // query for the authenticated user's generations
  query: {
    bool: {
      must: [
        {
          term: {
            'event.provider': ATTACK_DISCOVERY_EVENT_PROVIDER,
          },
        },
        {
          term: {
            'user.name': authenticatedUser.username,
          },
        },
        {
          term: {
            'kibana.space_ids': spaceId,
          },
        },
        {
          range: {
            '@timestamp': {
              gte: start,
              lte: end,
              format: 'strict_date_optional_time',
            },
          },
        },
        {
          exists: {
            field: 'kibana.alert.rule.execution.uuid',
          },
        },
        {
          exists: {
            field: 'event.dataset', // connector id
          },
        },
        {
          exists: {
            field: 'event.action',
          },
        },
        // When `scheduled` is provided, filter by `event.category` (the generation source):
        // - `true`  → only scheduled runs (event.category: scheduled)
        // - `false` → only ad-hoc runs (event.category: interactive or action)
        // The `event.category` field is always set by `writeAttackDiscoveryEvent` via the `source`
        // parameter, so this filter is reliable.
        ...(scheduled === true
          ? [{ term: { 'event.category': 'scheduled' } }]
          : scheduled === false
          ? [{ bool: { must_not: [{ term: { 'event.category': 'scheduled' } }] } }]
          : []),
      ],
    },
  },
});
