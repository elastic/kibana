/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { ESQLAstItem } from '@elastic/esql/types';
import { boundedMatchQuery, parseMatchQuery } from './confirmation_query';

/** One profile query and how far back it looks. */
export interface ProfileQuery {
  query: string;
  lookbackMinutes: number;
}

/** The grounding skill's Step 4 queries for a rule whose predicate has no isolating scope. */
export interface ProfileQueries {
  spread: ProfileQuery;
  trendBuckets: ProfileQuery;
  trendEdges: ProfileQuery;
}

/** The fields the skill allows the spread to group by, in order of preference. */
export const SPREAD_GROUP_FIELDS = ['service.name', 'k8s.deployment.name', 'host.name'] as const;

const SPREAD_LOOKBACK_MINUTES = 60;
const TREND_BUCKETS_LOOKBACK_MINUTES = 24 * 60;
const TREND_EDGES_LOOKBACK_MINUTES = 14 * 24 * 60;

/** A keyword equality or `IN` condition: the only thing that can isolate an operation. */
const SCOPE_OPERATORS = new Set(['==', 'in']);

const containsScope = (node: ESQLAstItem): boolean => {
  if (Array.isArray(node)) return node.some(containsScope);
  if (typeof node.name === 'string' && SCOPE_OPERATORS.has(node.name.toLowerCase())) return true;
  return 'args' in node && Array.isArray(node.args) ? node.args.some(containsScope) : false;
};

/** The first allowed spread field the data has as a column, if any. */
export const pickSpreadGroupField = (
  columns: ReadonlyArray<{ name: string }>
): string | undefined =>
  SPREAD_GROUP_FIELDS.find((field) => columns.some(({ name }) => name === field));

/**
 * Builds the spread and trend queries of Step 4 from a stored filter-only MATCH query. Only the
 * no-isolating-scope case is built, because it needs no judgement: a predicate with an equality
 * or `IN` condition may select an operation, which only the agent can split from the failure.
 * The spread groups by `groupField`, which must be a column the data has; with none, it counts
 * the failing lines without a breadth.
 */
export const buildProfileQueries = ({
  esqlQuery,
  viewName,
  groupField,
}: {
  esqlQuery: string;
  viewName?: string;
  groupField?: string;
}): ProfileQueries | undefined => {
  const parts = parseMatchQuery({ esqlQuery, viewName });
  if (!parts || containsScope(parts.predicates)) return undefined;

  const field = groupField === undefined ? undefined : esql.col(groupField.split('.'));
  const spread =
    field === undefined
      ? boundedMatchQuery(parts).pipe`STATS failed = COUNT(*)`
      : boundedMatchQuery(parts).pipe`STATS affected = COUNT(*) BY ${field}`
          .pipe`STATS failed = SUM(affected), services_hit = COUNT(*), top_failed = MAX(affected), top_names = TOP(affected, 5, "desc", ${field})`;

  return {
    spread: { query: spread.print('basic'), lookbackMinutes: SPREAD_LOOKBACK_MINUTES },
    trendBuckets: {
      query: boundedMatchQuery(parts)
        .pipe`STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, 50, ?_tstart, ?_tend)`
        .pipe`SORT bucket ASC`.print('basic'),
      lookbackMinutes: TREND_BUCKETS_LOOKBACK_MINUTES,
    },
    trendEdges: {
      query: boundedMatchQuery(parts)
        .pipe`STATS earliest = MIN(@timestamp), latest = MAX(@timestamp)`.print('basic'),
      lookbackMinutes: TREND_EDGES_LOOKBACK_MINUTES,
    },
  };
};
