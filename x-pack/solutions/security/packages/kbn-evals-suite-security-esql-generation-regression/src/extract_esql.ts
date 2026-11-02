/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';

interface ConverseStep {
  type?: string;
  tool_id?: string;
  results?: unknown[];
  [k: string]: unknown;
}

interface ConverseLikeOutput {
  steps?: ConverseStep[];
  messages?: Array<{ message?: string }>;
}

/**
 * Tool ids whose results carry a generated ES|QL string. `generate_esql`
 * emits a `{ type: 'query', data: { esql } }` payload; `execute_esql` emits
 * a `{ type: 'esql_results', data: { query } }` payload alongside its rows.
 * Both are recognised here so the extractor still works for examples where
 * the agent chose to execute the query directly without surfacing the
 * intermediate `generate_esql` call (a known optimisation in the default
 * agent's prompt).
 */
const GENERATE_ESQL_TOOL_ID = platformCoreTools.generateEsql;
const EXECUTE_ESQL_TOOL_ID = platformCoreTools.executeEsql;

const QUERY_RESULT_TYPE = 'query';
const ESQL_RESULTS_RESULT_TYPE = 'esql_results';

/**
 * Match a fenced ES|QL code block (```esql ... ``` or untagged ``` ... ```).
 *
 * **`sql`-tagged blocks are intentionally NOT matched.** Models that
 * specifically label a block ```sql have told us their output is SQL,
 * not ES|QL, and treating it as ES|QL inflates the validity tier by
 * accidentally extracting SQL fragments that happen to start with `FROM`.
 * The downstream `ES|QL Validity` evaluator scores the empty extraction
 * 0, which is the correct outcome for a model that emitted SQL when
 * the task was ES|QL generation.
 */
const ESQL_FENCE_REGEX = /```(?:esql|ES\|QL)?\s*\n([\s\S]*?)\n\s*```/i;

/**
 * Last-resort heuristic: detect the canonical `FROM <index>` prelude of an
 * ES|QL statement. Used only when no tool result and no fenced block was
 * found; we extract from the `FROM` keyword to the end of the message.
 *
 * NB: this is intentionally permissive — the downstream
 * `EsqlValidity` evaluator parses the result with `@kbn/esql-language`, so
 * a non-ES|QL false positive will simply be scored 0 by the validator
 * rather than silently masquerading as a working query.
 */
const FROM_HEURISTIC_REGEX = /\bFROM\s+[\S]/i;

/**
 * Source commands an ES|QL query can legitimately start with. Per the
 * ES|QL grammar the only top-level statement openers are `FROM`, `ROW`,
 * and `SHOW`; anything else (`SELECT`, `WITH`, `ALTER`, `CREATE`, …) is
 * either SQL or natural-language prose, neither of which the suite
 * should score as a candidate query.
 */
const ESQL_SOURCE_COMMAND_REGEX = /^\s*(FROM|ROW|SHOW)\b/i;

/**
 * SQL-only verbs that, when they appear in the message BEFORE a `FROM`
 * keyword, identify that `FROM` as the FROM-clause of a SQL `SELECT`
 * (or sibling DML/DDL statement) rather than the source command of an
 * ES|QL query. Used to guard the `FROM` heuristic against models like
 * `openai-gpt-oss-120b` that emit raw SQL — `SELECT user.name FROM
 * logs-* WHERE ...` would otherwise be sliced into `FROM logs-*
 * WHERE ...` and scored as a (broken) ES|QL candidate.
 *
 * `WITH` is intentionally NOT in this list because the bare keyword
 * appears far too often as plain English in assistant prose (e.g.
 * "here's the query with the right filter applied"), which would
 * silently refuse legitimate ES|QL extractions. The SQL CTE shape
 * `WITH <name> [, <name>]* AS (` is handled by {@link SQL_CTE_REGEX}
 * separately, which disambiguates the two usages cleanly.
 */
const SQL_PRECEDING_VERB_REGEX =
  /\b(SELECT|INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE|MERGE)\b/i;

/**
 * SQL Common Table Expression shape: `WITH foo AS (SELECT ...)`. Matched
 * separately from {@link SQL_PRECEDING_VERB_REGEX} so the FROM-guard does
 * not get fooled by the English word "with" in assistant prose. The
 * combination of `\w+` followed by `AS (` is structural enough that it
 * does not collide with normal text (no English construction looks like
 * `with foo as (`).
 */
const SQL_CTE_REGEX = /\bWITH\s+\w+(?:\s*,\s*\w+)*\s+AS\s*\(/i;

/**
 * Return `true` when `text` carries a SQL-shaped clause that would mark
 * a downstream `FROM` keyword as the FROM-clause of a SQL statement
 * rather than the source command of an ES|QL query.
 */
function precedingTextLooksLikeSql(text: string): boolean {
  return SQL_PRECEDING_VERB_REGEX.test(text) || SQL_CTE_REGEX.test(text);
}

/**
 * Return `true` when `query` plausibly opens with an ES|QL source
 * command. Used as a final shape guard for free-form extraction paths
 * (fenced block, `FROM` heuristic) so SQL or prose that happens to
 * contain a `FROM` keyword does not propagate as a candidate query.
 *
 * Tool-call extraction paths (`generate_esql` / `execute_esql`) skip
 * this guard because those tools are contracted to emit ES|QL — adding
 * the check there would regress legitimate edge cases (e.g. an ES|QL
 * statement with unusual leading whitespace or comments).
 */
function looksLikeEsql(query: string): boolean {
  return ESQL_SOURCE_COMMAND_REGEX.test(query);
}

/**
 * Extract the generated ES|QL query string from an Agent Builder
 * `converse` response.
 *
 * Strategy (first match wins):
 *
 *   1. **Structured tool result** — scan `steps` for a `tool_call` step with
 *      `tool_id === 'platform.core.generate_esql'` and pull
 *      `results[].data.esql`. If absent, fall through to
 *      `platform.core.execute_esql` whose result carries the same query
 *      under `results[].data.query`. This is the supported, deterministic
 *      path and what the LangSmith-era `DefaultAssistantGraph` used to
 *      surface via `result.queries[last]`.
 *   2. **Fenced markdown block** — extract the first triple-backtick block
 *      tagged `esql` / `ES|QL` (or untagged) from the final assistant
 *      message. ```sql blocks are intentionally skipped — see
 *      {@link ESQL_FENCE_REGEX}. The extracted text must pass the
 *      {@link looksLikeEsql} shape check or the result is discarded
 *      and the FROM heuristic is tried.
 *   3. **`FROM` heuristic** — slice the final message from the first
 *      `FROM` keyword onward, AS LONG AS no SQL clause precedes it.
 *      "SQL clause" here means either a SQL verb (`SELECT`, `INSERT`,
 *      `UPDATE`, `DELETE`, `ALTER`, `CREATE`, `DROP`, `TRUNCATE`,
 *      `MERGE`) or a CTE shape (`WITH <name> AS (`). When a SQL clause
 *      precedes the `FROM`, the FROM is part of a SQL statement, not
 *      an ES|QL source command, and the extractor returns empty.
 *      Note that the bare word "with" in prose is NOT treated as a
 *      SQL clause — too many assistant responses say things like
 *      "here is the query with the right filter applied".
 *
 * Returns an empty string when no ES|QL could be extracted; the downstream
 * evaluators handle the empty-string case (validity returns 0, execution
 * returns an error result, equivalence returns "missing prediction").
 */
export function extractEsqlFromConverseResponse(output: ConverseLikeOutput): string {
  const steps = output?.steps ?? [];

  for (const step of steps) {
    if (step?.type === 'tool_call') {
      if (step.tool_id === GENERATE_ESQL_TOOL_ID) {
        const fromResults = pickEsqlFromResults(step.results, QUERY_RESULT_TYPE, 'esql');
        if (fromResults) return fromResults;
      } else if (step.tool_id === EXECUTE_ESQL_TOOL_ID) {
        const fromResults = pickEsqlFromResults(step.results, ESQL_RESULTS_RESULT_TYPE, 'query');
        if (fromResults) return fromResults;
      }
    }
  }

  const finalMessage = getFinalMessage(output);
  if (!finalMessage) return '';

  const fenced = finalMessage.match(ESQL_FENCE_REGEX);
  if (fenced?.[1]) {
    const candidate = fenced[1].trim();
    if (looksLikeEsql(candidate)) return candidate;
    // The fenced block exists but its content is not ES|QL-shaped —
    // do NOT fall through to the FROM heuristic on the surrounding
    // prose. The model already committed to a code block; trying to
    // salvage a `FROM` from the rest of the message would be worse
    // signal than scoring this candidate 0.
    return '';
  }

  const fromMatch = finalMessage.match(FROM_HEURISTIC_REGEX);
  if (fromMatch && typeof fromMatch.index === 'number') {
    const beforeFrom = finalMessage.slice(0, fromMatch.index);
    if (precedingTextLooksLikeSql(beforeFrom)) {
      // SQL `SELECT col FROM table` (or sibling DDL/DML / CTE) — the
      // `FROM` we matched is not an ES|QL source command. Refuse the
      // extraction so the validity evaluator scores it 0.
      return '';
    }
    return finalMessage.slice(fromMatch.index).trim();
  }

  return '';
}

/**
 * Internal: walk a tool-call `results` array looking for the first entry of
 * the expected `type` whose `data` carries the requested string field, and
 * return that string trimmed.
 */
function pickEsqlFromResults(
  results: unknown[] | undefined,
  expectedType: string,
  fieldName: 'esql' | 'query'
): string {
  if (!Array.isArray(results)) return '';

  const match = results.find(
    (candidate): candidate is { type: unknown; data: Record<string, unknown> } => {
      if (!candidate || typeof candidate !== 'object') return false;
      const typed = candidate as { type?: unknown; data?: unknown };
      if (typed.type !== expectedType) return false;
      if (!typed.data || typeof typed.data !== 'object') return false;
      const value = (typed.data as Record<string, unknown>)[fieldName];
      return typeof value === 'string' && value.trim().length > 0;
    }
  );

  if (!match) return '';
  return String(match.data[fieldName]).trim();
}

function getFinalMessage(output: ConverseLikeOutput): string {
  const messages = output?.messages ?? [];
  const last = messages[messages.length - 1];
  return typeof last?.message === 'string' ? last.message : '';
}
