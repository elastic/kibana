/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { ESQLAstItem } from '@elastic/esql/types';
import { parseMatchQuery } from './confirmation_query';

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

const WINDOW = 'WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend';
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

const hasScopeCondition = (predicates: string[]): boolean =>
  predicates.some((predicate) => {
    const { root } = Parser.parse(`FROM x | ${predicate}`);
    return root.commands.slice(1).some((command) => containsScope(command.args));
  });

/**
 * Builds the spread and trend queries of Step 4 from a stored filter-only MATCH query. Only the
 * no-isolating-scope case is built, because it needs no judgement: a predicate with an equality
 * or `IN` condition may select an operation, which only the agent can split from the failure.
 * Anything else yields nothing and the agent builds the profile from the skill.
 */
export const buildProfileQueries = (params: {
  esqlQuery: string;
  viewName?: string;
}): ProfileQueries | undefined => {
  const parts = parseMatchQuery(params);
  if (!parts || hasScopeCondition(parts.predicates)) return undefined;

  const base = [`FROM ${parts.target}`, WINDOW, ...parts.predicates];
  return {
    spread: {
      query: [
        ...base,
        'STATS affected = COUNT(*) BY service.name',
        'STATS failed = SUM(affected), services_hit = COUNT(*), top_failed = MAX(affected), top_names = TOP(affected, 5, "desc", service.name)',
      ].join(' | '),
      lookbackMinutes: SPREAD_LOOKBACK_MINUTES,
    },
    trendBuckets: {
      query: [
        ...base,
        'STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, 50, ?_tstart, ?_tend)',
        'SORT bucket ASC',
      ].join(' | '),
      lookbackMinutes: TREND_BUCKETS_LOOKBACK_MINUTES,
    },
    trendEdges: {
      query: [...base, 'STATS earliest = MIN(@timestamp), latest = MAX(@timestamp)'].join(' | '),
      lookbackMinutes: TREND_EDGES_LOOKBACK_MINUTES,
    },
  };
};
