/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { AuthenticatedUser } from '@kbn/core-security-common';

import {
  ATTACK_DISCOVERY_EVENT_PROVIDER,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED,
} from '../../../../../common/constants';

export const DEFAULT_END = 'now';
export const DEFAULT_START = 'now-24h';

/**
 * Returns an Elasticsearch query to search the event to extract metadata
 * (timing) about the authenticated users' successful generations
 */
export const getSuccessfulGenerationsQuery = ({
  authenticatedUser,
  end = DEFAULT_END,
  eventLogIndex,
  size,
  spaceId,
  start = DEFAULT_START,
}: {
  authenticatedUser: AuthenticatedUser;
  end?: string;
  eventLogIndex: string;
  size: number;
  spaceId: string;
  start?: string;
}): estypes.SearchRequest => ({
  // query metadata
  allow_no_indices: true,
  index: [eventLogIndex],
  ignore_unavailable: true,
  _source: false,
  size: 0,
  // aggregations group the successful generation events by their connector id
  aggs: {
    successfull_generations_by_connector_id: {
      terms: {
        field: 'event.dataset', // connector id
        size,
        order: {
          latest_successfull_generation: 'desc',
        },
      },
      aggs: {
        event_actions: {
          terms: {
            field: 'event.action',
          },
        },
        successful_generations: {
          value_count: {
            field: 'event.action',
          },
        },
        avg_event_duration_nanoseconds: {
          avg: {
            field: 'event.duration',
          },
        },
        latest_successfull_generation: {
          max: {
            field: 'event.end',
            format: 'strict_date_optional_time',
          },
        },
      },
    },
  },
  // query to filter the events to only include the authenticated user's successful generations
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
          term: {
            'event.action': ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED,
          },
        },
        {
          exists: {
            field: 'event.dataset', // connector id
          },
        },
        {
          exists: {
            field: 'event.end',
          },
        },
        {
          exists: {
            field: 'event.duration',
          },
        },
      ],
    },
  },
});
