/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { KIND_BY_QUERY_ID } from './queries';

/**
 * Matches the results of the inventory queries: scheduled runs by `schedule_id`, and live-query
 * runs by `action_data.id` in the default space.
 */
export const inventoryResultsMatch = (scheduleIds: readonly string[]): QueryDslQueryContainer => ({
  bool: {
    should: [
      { terms: { schedule_id: [...scheduleIds] } },
      {
        bool: {
          filter: [
            { terms: { 'action_data.id': [...KIND_BY_QUERY_ID.keys()] } },
            { term: { 'action_data.space_id': DEFAULT_SPACE_ID } },
          ],
        },
      },
    ],
    minimum_should_match: 1,
  },
});

/** Filter clauses shared by every reader of inventory results. */
export const inventoryResultsFilter = (
  scheduleIds: readonly string[],
  since: string
): QueryDslQueryContainer[] => [
  inventoryResultsMatch(scheduleIds),
  { range: { '@timestamp': { gte: since } } },
  { exists: { field: 'agent.id' } },
];

/** A differential run reports only changes, which would read as a partial inventory. */
export const INVENTORY_RESULTS_MUST_NOT: QueryDslQueryContainer[] = [
  { terms: { 'osquery_meta.action': ['added', 'removed'] } },
];

/** The full bool query over inventory results newer than `since`. */
export const inventoryResultsQuery = (
  scheduleIds: readonly string[],
  since: string
): QueryDslQueryContainer => ({
  bool: {
    filter: inventoryResultsFilter(scheduleIds, since),
    must_not: INVENTORY_RESULTS_MUST_NOT,
  },
});
