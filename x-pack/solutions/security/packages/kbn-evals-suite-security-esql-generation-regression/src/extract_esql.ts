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
 * Match a fenced ES|QL code block (```esql ... ``` or ``` ... ```) followed
 * by the close fence. Used as the fallback path when the agent surfaces the
 * query in prose without a structured tool result (rare, but happens for
 * datasets where the agent refuses to invoke `generate_esql` and just types
 * the query out).
 */
const ESQL_FENCE_REGEX = /```(?:esql|esQL|ES\|QL|sql)?\s*\n([\s\S]*?)\n\s*```/i;

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
 *      from the final assistant message. Handles cases where the agent
 *      answers in prose with the query embedded.
 *   3. **`FROM` heuristic** — slice the final message from the first
 *      `FROM` keyword onward. Last resort; the validity evaluator scores
 *      the result so a bad slice cannot silently inflate the suite.
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
  if (fenced?.[1]) return fenced[1].trim();

  const fromMatch = finalMessage.match(FROM_HEURISTIC_REGEX);
  if (fromMatch && typeof fromMatch.index === 'number') {
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
