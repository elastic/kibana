/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default lower / upper bounds substituted for `?_tstart` / `?_tend` time
 * bind parameters when an evaluator executes an ES|QL query directly
 * against Elasticsearch.
 *
 * The agent-builder default agent emits ES|QL with `?_tstart` and `?_tend`
 * placeholders for the user's selected time window — in production those
 * are substituted at the API layer that calls `esClient.esql.query` with
 * a `params` argument. The evaluators in this suite run the produced
 * query directly against the cluster (no agent layer in the loop), so
 * Elasticsearch rejects the placeholder with `parsing_exception:
 * Unknown query parameter [_tstart]`. Substituting before execution
 * unblocks the query so the underlying intent can be measured.
 *
 * The window is intentionally wide (`2000-01-01` → `2100-12-31`) so the
 * substitution never artificially excludes fixture rows; whether the
 * candidate query returns the *right* rows is the job of the result
 * equivalence evaluator, not this substitution.
 */
export const DEFAULT_TSTART = '2000-01-01T00:00:00.000Z';
export const DEFAULT_TEND = '2100-12-31T23:59:59.999Z';

/**
 * Pattern matching the agent's named time bind parameters. `\b` after
 * the name guards against accidentally matching longer identifiers like
 * `?_tstartfoo` — only complete `?_tstart` / `?_tend` tokens are
 * substituted.
 */
const TSTART_TOKEN = /\?_tstart\b/g;
const TEND_TOKEN = /\?_tend\b/g;

/**
 * Substitute the agent's `?_tstart` / `?_tend` time bind parameters with
 * concrete ISO timestamp literals so an ES|QL query produced by the agent
 * can be executed directly via `esClient.esql.query`.
 *
 * Idempotent: returns the input unchanged when neither token appears.
 * Strings are emitted as double-quoted literals (`"2000-01-01T..."`)
 * which Elasticsearch interprets as date-shaped keywords when compared
 * against `@timestamp`, matching the in-production substitution shape.
 *
 * @param query Raw ES|QL string, possibly containing `?_tstart` / `?_tend`.
 * @param overrides Optional bounds override for tests or future
 *                  per-example calibration.
 * @returns ES|QL string safe to execute against an ES cluster.
 */
export function substituteEsqlBindParams(
  query: string,
  overrides?: { tstart?: string; tend?: string }
): string {
  if (typeof query !== 'string' || query.length === 0) return query;
  const tstart = overrides?.tstart ?? DEFAULT_TSTART;
  const tend = overrides?.tend ?? DEFAULT_TEND;
  return query.replace(TSTART_TOKEN, `"${tstart}"`).replace(TEND_TOKEN, `"${tend}"`);
}
