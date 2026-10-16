/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  runStoredQuery,
  type ProbeWindow,
  type StoredQueryResult,
} from '../../step_definitions/run_probe';
import { buildProfileQueries, pickSpreadGroupField, type ProfileQuery } from './profile_queries';
import type { DiscoveryContext } from './discovery_context';

const CONFIRMATION_LOOKBACK_MS = 15 * 60_000;
const MAX_CELL_LENGTH = 2_000;
const CONCURRENCY = 5;
const QUERY_TIMEOUT_MS = 20_000;
const TOTAL_BUDGET_MS = 60_000;

/** A grounding query as it ran: the query, the absolute window it was bound to, and its rows. */
export interface GroundingQueryResult {
  query: string;
  time_range: ProbeWindow;
  status: StoredQueryResult['status'];
  columns: Array<{ name: string }>;
  values: FieldValue[][];
}

/** The Step 3 sample of a rule and, when it returned rows and can be built, its Step 4 profile. */
export interface RuleGrounding {
  rule_uuid: string;
  confirmation: GroundingQueryResult;
  profile?: {
    /** The field the spread groups by, or null when the data has none of the allowed ones. */
    group_by: string | null;
    spread: GroundingQueryResult;
    trend_buckets: GroundingQueryResult;
    trend_edges: GroundingQueryResult;
  };
}

const clip = (value: FieldValue): FieldValue =>
  typeof value === 'string' && value.length > MAX_CELL_LENGTH
    ? `${value.slice(0, MAX_CELL_LENGTH)}…`
    : value;

/**
 * Runs, for every query KI of the context that has a confirmation query, the Step 3 sample and, when
 * that returned rows and the predicate has no scope to isolate, the Step 4 profile. Queries that
 * fail or time out are reported as such, never retried: the agent treats them as it would its own.
 */
export const runDiscoveryGrounding = async ({
  context,
  detectedAt,
  esClient,
  now,
  abortSignal,
}: {
  context: DiscoveryContext;
  /** Detection time by rule uuid (ISO); the confirmation window starts 15 minutes before it. */
  detectedAt: ReadonlyMap<string, string>;
  esClient: ElasticsearchClient;
  now: number;
  abortSignal: AbortSignal;
}): Promise<RuleGrounding[]> => {
  const limit = pLimit(CONCURRENCY);
  // The budget runs on the wall clock; `now` only anchors the windows.
  const deadlineAt = Date.now() + TOTAL_BUDGET_MS;

  const run = ({ query, from, to }: { query: string; from: number; to: number }) =>
    limit(async (): Promise<GroundingQueryResult> => {
      const window = { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
      const { status, columns, values } = await runStoredQuery({
        esClient,
        query,
        window,
        dropNullColumns: true,
        timeoutMs: QUERY_TIMEOUT_MS,
        deadlineAt,
        abortSignal,
      });
      return {
        query,
        time_range: window,
        status,
        columns,
        values: values.map((row) => row.map(clip)),
      };
    });
  const runProfile = ({ query, lookbackMinutes }: ProfileQuery) =>
    run({ query, from: now - lookbackMinutes * 60_000, to: now });

  const withConfirmation = context.query_kis.flatMap((ki) =>
    ki.confirmation_query === undefined ? [] : [{ ki, confirmationQuery: ki.confirmation_query }]
  );

  return Promise.all(
    withConfirmation.map(async ({ ki, confirmationQuery }): Promise<RuleGrounding> => {
      const detected = Date.parse(detectedAt.get(ki.rule.id) ?? '');
      const confirmation = await run({
        query: confirmationQuery,
        from: (Number.isNaN(detected) ? now : detected) - CONFIRMATION_LOOKBACK_MS,
        to: now,
      });
      const groupField = pickSpreadGroupField(confirmation.columns);
      const profileQueries =
        confirmation.status === 'ok' && confirmation.values.length > 0
          ? buildProfileQueries({
              esqlQuery: ki.query.esql.query,
              viewName: ki.view_name,
              groupField,
            })
          : undefined;
      if (!profileQueries) return { rule_uuid: ki.rule.id, confirmation };

      const [spread, trendBuckets, trendEdges] = await Promise.all([
        runProfile(profileQueries.spread),
        runProfile(profileQueries.trendBuckets),
        runProfile(profileQueries.trendEdges),
      ]);
      return {
        rule_uuid: ki.rule.id,
        confirmation,
        profile: {
          group_by: groupField ?? null,
          spread,
          trend_buckets: trendBuckets,
          trend_edges: trendEdges,
        },
      };
    })
  );
};
