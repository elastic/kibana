/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { AuthenticatedUser } from '@kbn/core-security-common';

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
  size,
  start = DEFAULT_START,
  spaceId,
}: {
  authenticatedUser: AuthenticatedUser;
  end?: string;
  eventLogIndex: string;
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
      ],
    },
  },
});
