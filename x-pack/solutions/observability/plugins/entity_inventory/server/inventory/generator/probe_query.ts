/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertSafeIndexPattern, quoteIdentifier } from './esql_syntax';
import { assertParses } from './parse_guard';
import type { GeneratedQuery } from './types';

/**
 * Builds the probe that decides whether a source gets a `TS` plan. The executor runs it as the
 * user, once per distinct pattern, and reads the type of the `@timestamp` column:
 *
 * - any type but `null`: at least one readable time-series index is behind the pattern, so the
 *   source gets a `TS` plan next to its `FROM` plan. `TS` resolves only time-series indices and the
 *   column is `null` only when none maps it, so an unexpected type runs the `TS` plan, where it
 *   fails visibly, rather than leaving those indices out.
 * - `null`: `TS` resolved no index the user can read. The pattern has no time-series index,
 *   matches nothing, or its time-series indices are unreadable; Elasticsearch drops all three
 *   silently and the probe cannot tell them apart. The source runs under `FROM` alone.
 *
 * Why a probe instead of running the `TS` list query and reading its result: `TS` resolves only
 * `index.mode: time_series` indices, and `TS ... | STATS` over a pattern where it resolves none
 * fails with a verification error ("the TS STATS command requires an @timestamp field of type date
 * or date_nanos but it was of type [null]"), a verifier rule in ES|QL's `TimeSeriesAggregate` that
 * the `TS` documentation does not mention. With `KEEP` instead of `STATS` the same pattern answers
 * with a `null`-typed column and no error, so the decision is a column type, never error text.
 *
 * `LIMIT 0` keeps the probe to planning: no shard is opened and no document is read, so it takes
 * a few milliseconds and grows only with the number of concrete indices behind the pattern.
 * `SET unmapped_fields="nullify"` is required: without it an unresolved `@timestamp` is
 * "Unknown column" instead of a `null` column.
 */
export const buildProbeQuery = (indexPattern: string): GeneratedQuery => {
  assertSafeIndexPattern(indexPattern);
  const esql = [
    'SET unmapped_fields="nullify";',
    `TS ${indexPattern}`,
    `| KEEP ${quoteIdentifier('@timestamp')}`,
    '| LIMIT 0',
  ].join('\n');

  assertParses(esql);
  return { esql, params: [] };
};
