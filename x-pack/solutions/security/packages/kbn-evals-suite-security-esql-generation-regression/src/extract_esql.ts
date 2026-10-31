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
 * The slice is NOT graded as-is: it must pass {@link looksLikeEsql}, which
 * rejects prose that merely contains the English preposition "from" (see
 * {@link ESQL_BARE_FROM_REGEX}). Relying on the downstream `EsqlValidity`
 * evaluator to score junk 0 is not enough — the candidate string is also
 * handed to the execution, result-equivalence and functional-equivalence
 * evaluators, and the LLM judge describes whatever it is given, so a prose
 * slice reads as a wrong answer from the model rather than a harness bug.
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
 * A real ES|QL pipe command: `| <command>`. The source command alone is
 * not enough to prove the statement is ES|QL — assistant prose can contain
 * the English preposition "from" followed by anything — so a pipe is the
 * cheapest structural evidence that the model emitted the clause grammar
 * rather than a sentence.
 */
const ESQL_PIPE_COMMAND_REGEX = /\|\s*[A-Za-z_@]/;

/**
 * A single ES|QL index expression: a backticked identifier or a bare index
 * pattern token. Bare tokens are restricted to the characters an unquoted
 * index pattern may contain, which excludes whitespace and sentence
 * punctuation — an English `from <word> <word>` cannot satisfy it.
 */
const ESQL_INDEX_TOKEN_PATTERN = '(?:`[^`]+`|[A-Za-z0-9_.*+-]+)';

const ESQL_INDEX_LIST_PATTERN = `${ESQL_INDEX_TOKEN_PATTERN}(?:\\s*,\\s*${ESQL_INDEX_TOKEN_PATTERN})*`;

/**
 * A complete, pipe-free `FROM` statement: source command, index list, and
 * the only clause ES|QL allows without a pipe (`METADATA`), with nothing
 * else in the string.
 *
 * This is what stops `from flagged processes. - **Convert to a detection
 * rule?** This query is read…` from being graded as a candidate query: the
 * index token is followed by prose, so the statement does not end where a
 * source command ends.
 */
const ESQL_BARE_FROM_REGEX = new RegExp(
  `^\\s*FROM\\s+${ESQL_INDEX_LIST_PATTERN}(?:\\s+METADATA\\s+${ESQL_INDEX_LIST_PATTERN})?\\s*$`,
  'i'
);

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
 * Return `true` when `query` is shaped like an ES|QL statement rather than
 * prose or SQL that happens to contain a `FROM` keyword. Used as the shape
 * guard for the free-form extraction paths (fenced block, `FROM`
 * heuristic).
 *
 * A statement passes when it opens with a source command (`FROM`, `ROW`,
 * `SHOW`) AND either:
 *
 *   - carries at least one pipe command (`| <command>`), which prose does
 *     not produce; or
 *   - for `ROW`/`SHOW`, is an expression statement (their operand has no
 *     index-token shorthand to check); or
 *   - for `FROM`, is a complete pipe-free source clause — an index list
 *     with an optional `METADATA` clause and nothing after it.
 *
 * Tool-call extraction paths (`generate_esql` / `execute_esql`) skip this
 * guard because those tools are contracted to emit ES|QL — adding the check
 * there would regress legitimate edge cases (e.g. an ES|QL statement with
 * unusual leading whitespace or comments).
 */
function looksLikeEsql(query: string): boolean {
  const source = query.match(ESQL_SOURCE_COMMAND_REGEX);
  if (!source) return false;

  const command = source[1].toUpperCase();
  if (command === 'ROW' || command === 'SHOW') return true;

  return ESQL_PIPE_COMMAND_REGEX.test(query) || ESQL_BARE_FROM_REGEX.test(query);
}

/**
 * Extract the generated ES|QL query string from an Agent Builder
 * `converse` response.
 *
 * Strategy (first match wins):
 *
 *   1. **Structured tool result** — the DELIVERED artifact: the LAST
 *      `tool_call` step with `tool_id === 'platform.core.generate_esql'`,
 *      pulling `results[].data.esql`. Only when no `generate_esql` result
 *      exists at all do we fall back to `platform.core.execute_esql`, whose
 *      result carries the same query under `results[].data.query`, again
 *      taking the LAST occurrence. This is the supported, deterministic
 *      path and what the LangSmith-era `DefaultAssistantGraph` used to
 *      surface via `result.queries[last]`.
 *
 *      Order matters in both directions: taking the FIRST query-bearing
 *      step grades whatever the agent probed the cluster with while
 *      surveying it (a `execute_esql` `LIMIT 10` sample, typically) and lets
 *      a superseded `generate_esql` shadow the query the agent actually
 *      answered with.
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
 *      The slice must also pass {@link looksLikeEsql}, so the English
 *      preposition "from" inside prose is never returned as a candidate.
 *
 * Returns an empty string when no ES|QL could be extracted; the downstream
 * evaluators handle the empty-string case (validity returns 0, execution
 * returns an error result, equivalence returns "missing prediction").
 */
export function extractEsqlFromConverseResponse(output: ConverseLikeOutput): string {
  const steps = output?.steps ?? [];

  // 1. The delivered artifact: the LAST `generate_esql` result in the trace.
  //    A query the agent superseded, and an exploratory `execute_esql` probe
  //    it ran while surveying the cluster, must both stay out of the graded
  //    candidate.
  const generated = pickLastToolEsql(steps, GENERATE_ESQL_TOOL_ID, QUERY_RESULT_TYPE, 'esql');
  if (generated) return generated;

  // 2. Agents that execute their final query directly, without surfacing a
  //    `generate_esql` call. Last payload wins for the same reason.
  const executed = pickLastToolEsql(steps, EXECUTE_ESQL_TOOL_ID, ESQL_RESULTS_RESULT_TYPE, 'query');
  if (executed) return executed;

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
    const candidate = finalMessage.slice(fromMatch.index).trim();
    // This is the only path that slices arbitrary assistant text, and the
    // `FROM` it matched may be the English preposition rather than a source
    // command ("… events from flagged processes. - **Convert …"). Grade the
    // slice only when it is shaped like an ES|QL statement; otherwise report
    // "no prediction" rather than a query the model never produced.
    return looksLikeEsql(candidate) ? candidate : '';
  }

  return '';
}

/**
 * Internal: collect the ES|QL string carried by the LAST `tool_call` step
 * for `toolId`. Returns the empty string when no such step yields one.
 */
function pickLastToolEsql(
  steps: ConverseStep[],
  toolId: string,
  expectedType: string,
  fieldName: 'esql' | 'query'
): string {
  return steps.reduce((found: string, step) => {
    if (step?.type !== 'tool_call' || step.tool_id !== toolId) return found;
    return pickEsqlFromResults(step.results, expectedType, fieldName) || found;
  }, '');
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
