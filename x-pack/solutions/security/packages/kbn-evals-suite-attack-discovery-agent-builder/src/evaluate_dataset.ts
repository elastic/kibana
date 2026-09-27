/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import {
  getToolCallSteps,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type Evaluator,
  type ExperimentTask,
} from '@kbn/evals';
import type { HttpHandler } from '@kbn/core/public';
import type { AttackDiscoveryAgentBuilderChatClient } from './chat_client';
import { attackDiscoveryFixtureIndex } from './fixtures';
import type {
  AttackDiscovery,
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
  AttackDiscoveryRetrievalEvidence,
  RetrievedAlertCountSource,
} from './types';
import { createAdToolResultEvaluator } from './evaluators/ad_tool_result_evaluator';
import { createAttackDiscoveryBasicEvaluator } from './evaluators/attack_discovery_basic_evaluator';
import { createAttackDiscoveryCriteriaEvaluator } from './evaluators/attack_discovery_criteria_evaluator';
import { createAttackDiscoveryRubricEvaluator } from './evaluators/attack_discovery_rubric_evaluator';
import { createCostPerAlertEvaluator } from './evaluators/cost_per_alert_evaluator';
import { createForbiddenToolsEvaluator } from './evaluators/forbidden_tools_evaluator';
import { createResponseSkillInvocationEvaluator } from './evaluators/skill_invoked_evaluator';
import { createStrictTrajectoryEvaluator } from './evaluators/trajectory_evaluator';
import { createWorkflowEvidenceEvaluator } from './evaluators/workflow_evidence_evaluator';
import { redactExecutionIds } from './redact';
import {
  createDiscoveryCountCapEvaluator,
  createMinValidatedDiscoveryEvaluator,
  createNoiseFalsePositiveEvaluator,
} from './evaluators/noise_fpr_evaluator';

type AdToolResult = NonNullable<AttackDiscoveryAgentBuilderTaskOutput['adToolResult']>;

const getNumber = (value: unknown): number | null => (typeof value === 'number' ? value : null);
const getString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const getAdStatus = (value: unknown, resultType?: string): AdToolResult['status'] => {
  if (value === 'completed' || value === 'pending') return value;
  if (resultType === 'error') return 'error';
  return null;
};

export const findAdToolResult = (
  steps: AttackDiscoveryAgentBuilderTaskOutput['steps']
): AttackDiscoveryAgentBuilderTaskOutput['adToolResult'] | undefined => {
  const adStep = steps.find((step) => step.tool_id === 'security.attack-discovery.run');
  // run_attack_discovery_tool/index.ts returns `{ data, tool_result_id, type }` — `type` is a sibling of `data`.
  const adResult = adStep?.results?.[0] as
    | { data?: Record<string, unknown>; type?: string }
    | undefined;
  const adResultData = adResult?.data;
  if (!adResultData) return undefined;

  const executionUuid =
    typeof adResultData.execution_uuid === 'string' ? adResultData.execution_uuid : undefined;

  return {
    status: getAdStatus(adResultData.status, adResult?.type),
    executionUuid,
    // `security.attack-discovery.run` (run_attack_discovery_tool/index.ts)
    // reports `alerts_context_count` from `alertRetrievalResult.alertsContextCount`
    // (run_manual_orchestration/index.ts `state.alertRetrievalResult`), which is
    // assigned AFTER the gate — the exact candidate set handed to generation as
    // `additional_alerts` (invoke_generation_workflow.ts). That is the count of
    // alerts PASSED into generation, not retrieved. See Fix 1 below for how the
    // two fields consume this differently.
    alertsContextCount: getNumber(adResultData.alerts_context_count),
    discoveryCount: getNumber(adResultData.discovery_count),
  };
};

/** The pipeline response (`get_pipeline_data.ts`), as far as this suite reads it. */
export interface AttackDiscoveryPipelineResponse {
  alert_retrieval?: Array<{
    alerts?: unknown;
    alerts_context_count?: unknown;
    extraction_strategy?: unknown;
  }> | null;
  combined_alerts?: { alerts?: unknown; alerts_context_count?: unknown } | null;
  diagnostics_context?: { config?: { alertRetrievalMode?: unknown } } | null;
  validated_discoveries?: unknown[] | null;
  workflow_executions_tracking?: Record<string, unknown> | null;
}

/**
 * A stage counts as tracked once `workflow_executions_tracking` reports a value
 * for it; the product writes `null` for phases that have not started. `stages`
 * and the persisted key booleans read this same predicate so they cannot drift.
 */
const isTrackedStage = (value: unknown): boolean => value !== null && value !== undefined;

export const trackedStages = (tracking: Record<string, unknown> | null | undefined): string[] =>
  Object.entries(tracking ?? {})
    .filter(([, value]) => isTrackedStage(value))
    .map(([stage]) => stage);

export const trackedStageKeys = (
  tracking: Record<string, unknown> | null | undefined
): Record<string, boolean> =>
  Object.fromEntries(
    Object.entries(tracking ?? {}).map(([stage, value]) => [stage, isTrackedStage(value)])
  );

/**
 * The alerts index the suite's fixtures seed, reduced to its family prefix
 * (`attackDiscoveryFixtureIndex` = `.alerts-security.alerts-default` becomes
 * `.alerts-security.alerts`) so a space-scoped sibling also matches. A query
 * against any other index is not a retrieval of the population the profile
 * expects, so it must not produce a retrieved count.
 */
export const ALERT_INDEX_FAMILY = attackDiscoveryFixtureIndex.replace(/-default$/, '');

/** The `_id` column of an ES|QL result: the alert identity the observed
 *  population is counted by (see `extractAgentAlertRetrievalPopulation`). */
const ALERT_ID_COLUMN = '_id';

interface AgentEsqlResult {
  /** The ES|QL text this result came from, as the result reports it (falling
   *  back to the step's own `params.query` when the result carries none). */
  query: string | null;
  /** Rows in `data.values` — the result the agent actually received. */
  rowCount: number;
  /** The `_id` each row carried, in row order; `null` when the result reported
   *  no `_id` column, i.e. the query kept no identity for its rows. */
  alertIds: string[] | null;
}

/** Index of the `_id` column in `data.columns`, or -1 when the result has none. */
const getIdColumnIndex = (columns: unknown): number =>
  Array.isArray(columns)
    ? columns.findIndex(
        (column) => getString((column as { name?: unknown } | null)?.name) === ALERT_ID_COLUMN
      )
    : -1;

/**
 * The `_id`s a result's rows carry, or `null` when it reports no `_id` column.
 * `null` means "these rows' identities are unknown", which is NOT the same as
 * `[]` ("the result returned no rows") — the two produce different observed
 * populations in `extractAgentAlertRetrievalPopulation`.
 */
const extractResultAlertIds = (columns: unknown, values: unknown[]): string[] | null => {
  const idColumnIndex = getIdColumnIndex(columns);
  if (idColumnIndex === -1) return null;

  return values.flatMap((row) => {
    const id = Array.isArray(row) ? getString(row[idColumnIndex]) : null;
    return id == null ? [] : [id];
  });
};

/** Every `platform.core.execute_esql` result the agent received, in step order. */
export const collectAgentEsqlResults = (
  steps: AttackDiscoveryAgentBuilderTaskOutput['steps']
): AgentEsqlResult[] =>
  (steps ?? [])
    .filter((step) => step?.tool_id === 'platform.core.execute_esql')
    .flatMap((step) => {
      const params = (step.params ?? {}) as { query?: unknown };
      return (step.results ?? []).flatMap((raw) => {
        const entry = raw as { type?: unknown; data?: unknown } | null | undefined;
        // Recorded shape (golden, 9/9 dense reps): `results[0]` echoes the query
        // (`type: 'query'`) and `results[1]` carries the rows
        // (`type: 'esql_results'`, `data.values`). Only the latter is a result.
        if (entry?.type !== 'esql_results') return [];
        const data = (entry.data ?? {}) as { query?: unknown; values?: unknown; columns?: unknown };
        if (!Array.isArray(data.values)) return [];
        return [
          {
            query: getString(data.query) ?? getString(params.query),
            rowCount: data.values.length,
            alertIds: extractResultAlertIds(data.columns, data.values),
          },
        ];
      });
    });

/** Row counts of every ES|QL result the agent received (evidence, unfiltered). */
export const extractAgentEsqlRowCounts = (
  steps: AttackDiscoveryAgentBuilderTaskOutput['steps']
): number[] => collectAgentEsqlResults(steps).map((result) => result.rowCount);

const readsAlertsIndex = (result: AgentEsqlResult): boolean => readsAlertsIndexQuery(result.query);

/**
 * Whether a query carries the example's retrieval scope. A `null` scope (the
 * example declares none) accepts every query: the check belongs to the EXAMPLE,
 * not to the observable.
 *
 * Both observables are checked with this ONE predicate — the agent's own ES|QL
 * results and the `esql_query` the agent handed
 * `security.attack-discovery.run` — so the agent-side and pipeline-side scope
 * rules cannot drift apart.
 *
 * The marker has to participate in a RESTRICTIVE clause, not merely appear in
 * the query text. A bare substring test accepted `FROM
 * .alerts-security.alerts-default | EVAL fixture = "<marker>" | LIMIT 95`: the
 * marker is present, the query filters on nothing, and its 95 arbitrary rows
 * from the shared index were scored as a complete retrieval of this fixture —
 * the exact failure the scope gate exists to prevent. Only text inside a
 * `WHERE` clause counts, and comments are stripped first so a marker mentioned
 * in a comment cannot pass either.
 *
 * This stays a text check rather than a full predicate parse because the
 * recorded scoped queries spell the marker four different ways (`tags == "x"`,
 * `tags LIKE "*x*"`, `QSTR("x")`, and a two-branch OR whose BOTH branches name
 * the marker); all of them put it inside a `WHERE`, which is what the check
 * requires. It is not a bare substring test either: the marker must appear in a
 * POSITIVE, RESTRICTIVE predicate on EVERY top-level alternative, so three
 * classes of unrestricted `WHERE` are rejected —
 *
 * - NEGATION: `WHERE tags != "<marker>"` contains the marker in a restrictive
 *   clause but selects everything EXCEPT this run's documents.
 * - TAUTOLOGY: `WHERE tags == "<marker>" OR true` selects the whole index.
 * - WIDENING: `WHERE tags == "<marker>" OR tags == "<other-run>"` unions this
 *   run with another, so its rows (and any exact-looking row count) may all
 *   belong to the other run on the shared index. A positive marker in ONE
 *   branch does not narrow the others, which is why the test is `every` rather
 *   than `some`. The tautology class falls out of the same rule, since a `true`
 *   branch names no marker.
 *
 * All three were accepted by earlier revisions and all three defeat the
 * exact-population assertion this profile is built on: their rows are an
 * unrelated population that then scored as a complete retrieval of this
 * fixture.
 *
 * Residual limitation, stated plainly: this recognises the operator shapes the
 * recorded queries and the reported payloads use, not ES|QL semantics. A
 * marker reached through a function whose result is then negated still passes.
 * Closing that needs a real predicate evaluator rather than a stricter text
 * check.
 */

/**
 * Blank out the CONTENTS of quoted literals, preserving every character offset.
 *
 * Structural scanning (WHERE / OR / AND / `|`) has to run on this rather than
 * the raw query: a quoted command line or URL can contain `//`, `|`, ` OR `, or
 * the word WHERE, and treating those as syntax splits one query into phantom
 * segments and truncates it before a later marker predicate. Offsets are
 * preserved so the caller can slice the ORIGINAL string once it has decided
 * where the real boundaries are.
 */
const maskQuotedLiterals = (query: string): string => {
  const characters = [...query];
  let quote: string | null = null;

  for (let index = 0; index < characters.length; index++) {
    const character = characters[index];

    if (quote !== null) {
      if (character === '\\' && index + 1 < characters.length) {
        characters[index + 1] = 'x';
        index++;
      } else if (character === quote) {
        quote = null;
      } else {
        characters[index] = 'x';
      }
    } else if (character === '"' || character === "'") {
      quote = character;
    }
  }

  return characters.join('');
};

/**
 * Split on `pattern` only where it is real syntax, never inside a literal.
 * Boundaries come from the masked query; the slices come from the original, so
 * the caller keeps its own casing and spacing.
 */
const splitOutsideQuotes = (query: string, pattern: RegExp): string[] => {
  const masked = maskQuotedLiterals(query);
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const matcher = new RegExp(pattern.source, flags);
  const parts: string[] = [];
  let start = 0;
  let match = matcher.exec(masked);

  while (match !== null) {
    parts.push(query.slice(start, match.index));
    start = match.index + match[0].length;
    match = matcher.exec(masked);
  }

  parts.push(query.slice(start));
  return parts;
};

/**
 * Blank out the CONTENTS of comments, preserving every character offset.
 *
 * Pipeline boundaries have to be located on this rather than on the raw query.
 * A `|` inside a comment is not a pipeline separator, but locating boundaries
 * before removing comments invented a second segment out of comment text:
 *
 *   FROM ... | LIMIT 95 // | WHERE tags == "<marker>"
 *
 * executes as an unscoped 95-row query, yet the comment's `|` split off a
 * synthetic ` WHERE tags == "<marker>"` segment that looked scoped. Comment
 * state is now tracked while locating boundaries, so pipes and `WHERE` text
 * inside comments can never become executable-looking segments.
 *
 * Quote state comes from the quote mask, so a `//` inside a quoted literal is
 * still literal text and does not start a comment.
 */
const maskComments = (query: string): string => {
  // Start from the QUOTE mask so literal contents are already blanked: a `|` or
  // a `//` inside a quoted literal is data, and must not be seen as either a
  // separator or the start of a comment. Comment spans are then blanked on top.
  const quoted = maskQuotedLiterals(query);
  const characters = [...quoted];
  let index = 0;

  while (index < characters.length) {
    const isLineComment = quoted[index] === '/' && quoted[index + 1] === '/';
    const isBlockComment = quoted[index] === '/' && quoted[index + 1] === '*';

    if (isLineComment) {
      const newline = quoted.indexOf('\n', index);
      const end = newline < 0 ? characters.length : newline;
      for (let position = index; position < end; position++) characters[position] = 'x';
      index = end;
    } else if (isBlockComment) {
      const close = quoted.indexOf('*/', index + 2);
      const end = close < 0 ? characters.length : close + 2;
      for (let position = index; position < end; position++) characters[position] = 'x';
      index = end;
    } else {
      index++;
    }
  }

  return characters.join('');
};

const splitPipelineSegments = (query: string): string[] => {
  // Boundaries come from the masked copy: a `|` inside a literal or a comment
  // is data, not a separator. The segments themselves are sliced from the
  // original and comment-stripped, so callers keep the real query text.
  const masked = maskComments(query);
  const boundaries = [...masked]
    .map((character, index) => (character === '|' ? index : -1))
    .filter((index) => index >= 0);
  const starts = [0, ...boundaries.map((index) => index + 1)];

  return starts.map((start, position) => {
    const end = position < boundaries.length ? boundaries[position] : query.length;
    return stripComments(query.slice(start, end));
  });
};

/**
 * Remove ES|QL comments, respecting quoted literals.
 *
 * `//` is only a comment when it is not inside a string, which is exactly the
 * case a command-line literal such as `https://...` creates.
 */
const stripComments = (segment: string): string => {
  const masked = maskQuotedLiterals(segment);
  let result = '';
  let index = 0;

  while (index < segment.length) {
    const isLineComment = masked[index] === '/' && masked[index + 1] === '/';
    const isBlockComment = masked[index] === '/' && masked[index + 1] === '*';

    if (isLineComment) {
      const newline = segment.indexOf('\n', index);
      if (newline < 0) {
        index = segment.length;
      } else {
        index = newline;
      }
      result += ' ';
    } else if (isBlockComment) {
      const end = segment.indexOf('*/', index + 2);
      index = end < 0 ? segment.length : end + 2;
      result += ' ';
    } else {
      result += segment[index];
      index++;
    }
  }

  return result;
};

/**
 * Whether a query reads the alert index family.
 *
 * The pipeline runs the AD tool's `esql_query` itself, so that query is held to
 * the same "reads the alert index" bar as the agent's own retrievals — and both
 * sides go through here so they cannot drift apart.
 *
 * `null` (no query supplied) is NOT a pass: the pipeline still retrieved
 * something, but nothing about it says it read this fixture's index.
 *
 * Comments are stripped first: `FROM logs-endpoint.events.process-default
 * // .alerts-security.alerts` reads a different index entirely, and letting the
 * comment satisfy this check admitted a 95-row count from an unrelated source
 * as this fixture's population.
 */
const readsAlertsIndexQuery = (query: string | null): boolean =>
  query != null && stripComments(query).includes(ALERT_INDEX_FAMILY);

/**
 * The positions where the marker appears as a filter VALUE rather than as
 * incidental text inside a larger literal.
 *
 * `includes(marker)` alone credits a query that merely mentions the marker as
 * data — `message == "the marker is <marker> here"` restricts nothing and
 * retrieves the whole shared index, yet its mention made the retrieval look
 * fixture-scoped. The marker is a value only when it is a complete literal
 * (`"<marker>"`, `QSTR("<marker>")`) or a LIKE fragment (`"*<marker>*"`), so it
 * has to be delimited by a quote or a LIKE wildcard on both sides.
 */
const markerValuePositions = (disjunct: string, marker: string): number[] => {
  const isDelimiter = (character: string | undefined): boolean =>
    character === '"' || character === "'" || character === '*';

  const positions: number[] = [];
  let index = disjunct.indexOf(marker);

  while (index >= 0) {
    if (isDelimiter(disjunct[index - 1]) && isDelimiter(disjunct[index + marker.length])) {
      positions.push(index);
    }
    index = disjunct.indexOf(marker, index + 1);
  }

  return positions;
};

/**
 * Whether the disjunct's marker literal sits behind a negation operator.
 *
 * The negation has to be attached to the MARKER's own predicate, not to the
 * disjunct. Generated ES|QL legitimately leads with an unrelated negated filter
 * and then positively filters the marker in a later `AND` branch:
 *
 *   WHERE NOT kibana.alert.workflow_status == "closed" AND tags == "<marker>"
 *
 * That query retrieves only this fixture, so treating it as negated scores a
 * correct run as a zero/unscoped retrieval. Earlier revisions keyed the check
 * off the disjunct's opening token (`/^\s*NOT\b/`), which is exactly this false
 * negative; the negation is now resolved per `AND` branch instead.
 */
const isNegatedMarkerPredicate = (
  disjunct: string,
  markerIndex: number,
  marker: string
): boolean => {
  if (markerIndex < 0) return false;

  // The branch the marker literal lives in: the text since the last `AND`.
  const branchStart = Math.max(
    disjunct.toLowerCase().lastIndexOf(' and ', markerIndex),
    disjunct.toLowerCase().lastIndexOf(' not ', markerIndex)
  );
  const branch = disjunct.slice(branchStart + 1, markerIndex);

  // `NOT tags == "<marker>"` / `NOT QSTR("<marker>")` — the negation leads this
  // branch, so it is not adjacent to the literal.
  if (/^\s*NOT\b/i.test(branch)) return true;

  // `tags != "<marker>"` / `tags <> "<marker>"` — the negation IS the operator
  // immediately before the literal, modulo the opening quote and whitespace.
  return /(!=|<>)\s*"?\s*$/.test(branch);
};

/**
 * A parsed ES|QL boolean expression: `NOT`, `AND`, `OR` and predicate leaves.
 *
 * Whether the marker is REQUIRED cannot be read off the query text. `OR` unions
 * and `NOT` inverts, so it depends on where the marker sits in the expression
 * tree:
 *
 *   tags == M AND NOT (host.name == "x")              -> scoped (M required)
 *   status == "open" AND NOT (host.name == "x" AND tags == M)
 *                                                     -> NOT scoped (M only excluded)
 *   tags == M AND (severity == "high" OR severity == "critical")
 *                                                     -> scoped (M required)
 *
 * A top-level `OR` split reads the second and third backwards — it accepts the
 * second and rejects the third.
 */
type BooleanNode =
  | { kind: 'leaf'; text: string }
  | { kind: 'not'; operand: BooleanNode }
  | { kind: 'and' | 'or'; operands: BooleanNode[] };

/**
 * Split on a top-level `operator`, ignoring literals, comments and parentheses.
 *
 * Parens are the reason this is not `splitOutsideQuotes`: the `OR` in
 * `tags == M AND (severity == "high" OR severity == "critical")` is nested
 * inside a group and does not make the marker optional.
 */
const splitTopLevel = (expression: string, operator: RegExp): string[] => {
  const masked = maskComments(expression);
  const matcher = new RegExp(operator.source, `${operator.flags.replace(/g/g, '')}g`);
  const parts: string[] = [];
  let start = 0;
  let match = matcher.exec(masked);

  while (match !== null) {
    const before = masked.slice(0, match.index);
    const depth = (before.match(/\(/g)?.length ?? 0) - (before.match(/\)/g)?.length ?? 0);

    if (depth === 0) {
      parts.push(expression.slice(start, match.index));
      start = match.index + match[0].length;
    }

    match = matcher.exec(masked);
  }

  parts.push(expression.slice(start));

  return parts;
};

/** Whether the whole expression is one parenthesised group. */
const isWrappedInParens = (expression: string): boolean => {
  const masked = maskComments(expression).trim();
  if (!masked.startsWith('(') || !masked.endsWith(')')) return false;

  let depth = 0;

  for (let index = 0; index < masked.length; index++) {
    if (masked[index] === '(') depth++;
    if (masked[index] === ')') {
      depth--;
      if (depth === 0) return index === masked.length - 1;
    }
  }

  return false;
};

const parseBooleanExpression = (expression: string): BooleanNode => {
  let text = expression.trim();
  while (isWrappedInParens(text)) text = text.trim().slice(1, -1).trim();

  const orParts = splitTopLevel(text, /\s+OR\s+/i);
  if (orParts.length > 1) return { kind: 'or', operands: orParts.map(parseBooleanExpression) };

  const andParts = splitTopLevel(text, /\s+AND\s+/i);
  if (andParts.length > 1) return { kind: 'and', operands: andParts.map(parseBooleanExpression) };

  const negation = /^NOT\s+/i.exec(text);
  if (negation !== null) {
    return { kind: 'not', operand: parseBooleanExpression(text.slice(negation[0].length)) };
  }

  return { kind: 'leaf', text };
};

type LeafRole = 'positive' | 'negated' | 'unrelated';

/**
 * Whether a leaf that names the marker as a value actually RESTRICTS to it.
 *
 * Naming the marker as a delimited literal is not enough:
 *
 *   "<marker>" == "<marker>"          constant true — admits every row
 *   tags IN ("<marker>", "<other>")   admits another run's rows
 *
 * Both spell the marker as a value, so a bare "does the marker appear as a
 * value" test calls them positively scoped and forces every non-marker row to
 * fail them — which is what let an arbitrary 95-id retrieval score as the dense
 * population. A leaf that does not restrict is not a marker predicate at all,
 * so it is reported as unrelated and left to the assignment search, which then
 * finds the row that satisfies the clause without the marker.
 */
const markerValueRestrictsToMarker = (text: string, marker: string): boolean => {
  // Strip the literals: a comparison with no identifier left on either side is
  // a constant (`"<marker>" == "<marker>"`), not a field restriction. `QSTR` is
  // a function over the marker and counts as an identifier; only the boolean
  // and comparison operators are ignored.
  const withoutLiterals = text.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
  const withoutOperators = withoutLiterals.replace(/\b(?:LIKE|IN|NOT|AND|OR)\b/gi, '');
  if (!/[A-Za-z_]/.test(withoutOperators)) return false;

  // `IN` accepts a LIST: `tags IN ("<marker>")` restricts to the marker, but
  // `tags IN ("<marker>", "<other-run>")` admits rows the fixture does not own.
  const inList = /\bIN\s*\(([^)]*)\)/i.exec(text);
  if (inList !== null) {
    const values = inList[1]
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    return values.length === 1 && values[0].includes(marker);
  }

  return true;
};

/**
 * How the marker figures in a leaf: positively filtered (`tags == "<marker>"`),
 * negatively filtered (`tags != "<marker>"`), or not a filter value at all —
 * which includes a leaf that merely mentions the marker as data, and one that
 * names it as a value without restricting to it.
 */
const leafRole = (text: string, marker: string): LeafRole => {
  const positions = markerValuePositions(text, marker);
  if (positions.length === 0) return 'unrelated';
  if (!markerValueRestrictsToMarker(text, marker)) return 'unrelated';

  return positions.some((position) => !isNegatedMarkerPredicate(text, position, marker))
    ? 'positive'
    : 'negated';
};

const collectLeaves = (node: BooleanNode): string[] => {
  if (node.kind === 'leaf') return [node.text];
  if (node.kind === 'not') return collectLeaves(node.operand);

  return node.operands.flatMap(collectLeaves);
};

const evaluateBoolean = (node: BooleanNode, resolve: (leaf: string) => boolean): boolean => {
  if (node.kind === 'leaf') return resolve(node.text);
  if (node.kind === 'not') return !evaluateBoolean(node.operand, resolve);

  return node.kind === 'and'
    ? node.operands.every((operand) => evaluateBoolean(operand, resolve))
    : node.operands.some((operand) => evaluateBoolean(operand, resolve));
};

/** Above this many free predicates the assignment search is not attempted. */
const MAX_FREE_PREDICATES = 16;

/**
 * Whether a row WITHOUT the marker can satisfy the expression.
 *
 * A non-marker row makes every positive marker predicate false, every negated
 * one true, and every unrelated predicate either way. If any such assignment
 * satisfies the expression, the expression does not restrict to the fixture —
 * which is the real question, and the one a text scan cannot answer.
 *
 * Unrelated predicates are searched exhaustively (2^n assignments, n bounded by
 * `MAX_FREE_PREDICATES`); a query with more free predicates than that is treated
 * as not restricting, since it cannot be PROVEN to restrict.
 */
const admitsNonMarkerRow = (node: BooleanNode, marker: string): boolean => {
  const leaves = collectLeaves(node);
  const roles = new Map(leaves.map((leaf) => [leaf, leafRole(leaf, marker)] as const));
  const free = leaves.filter((leaf) => roles.get(leaf) === 'unrelated');

  if (free.length > MAX_FREE_PREDICATES) return true;

  for (let assignment = 0; assignment < 2 ** free.length; assignment++) {
    // Which unrelated predicates this assignment makes true, read as a base-2
    // digit per predicate (avoiding bitwise ops, which the repo lint bans).
    const truthy = new Set(
      free.filter((_leaf, position) => Math.floor(assignment / 2 ** position) % 2 === 1)
    );
    const resolve = (leaf: string): boolean => {
      const role = roles.get(leaf);
      if (role === 'positive') return false;
      if (role === 'negated') return true;

      return truthy.has(leaf);
    };

    if (evaluateBoolean(node, resolve)) return true;
  }

  return false;
};

const carriesRetrievalScope = (query: string | null, retrievalScope: string | null): boolean => {
  if (retrievalScope == null) return true;
  if (query == null) return false;

  return splitPipelineSegments(query).some((segment) => {
    const whereBody = splitOutsideQuotes(segment, /\bWHERE\b/i)
      .slice(1)
      .join(' WHERE ');
    if (!whereBody.includes(retrievalScope)) return false;

    // The marker has to be REQUIRED by the clause — satisfied by every row the
    // clause admits. `OR` widens (`tags == M OR tags == "<other-run>"` admits
    // another run's rows), `NOT` excludes rather than requires
    // (`status == "open" AND NOT (host.name == "x" AND tags == M)` admits rows
    // without the marker), and a tautological branch (`OR true`) admits
    // everything. All three fall out of the same test.
    return !admitsNonMarkerRow(parseBooleanExpression(whereBody), retrievalScope);
  });
};

/**
 * The agent's alerts-index retrievals, split by whether they carry the
 * example's scope (`input.retrievalScope`).
 *
 * Reading the alerts index is necessary but NOT sufficient for a retrieval to
 * be this fixture's population: the index is shared (the golden-path spec seeds
 * two of its own alerts into the same `.alerts-security.alerts-default` the
 * dense profile seeds 95 into), so an unscoped query's row count describes
 * whatever the index held at that moment. `FROM
 * .alerts-security.alerts-default | LIMIT 95` returns 95 rows and was accepted
 * as a complete retrieval of the dense fixture while touching none of its
 * alerts.
 *
 * Measured on the recorded reps: all 18 recorded dense example-runs ran the
 * unscoped AD default query (0/18 carried the marker — and its `KEEP` list
 * returns no marker-bearing field, so the rows cannot carry it either), while
 * 6/6 recorded golden reps whose question names a marker carried it in the
 * query, in four different forms (`tags == "x"`, `tags LIKE "*x*"`,
 * `QSTR("x")`, an OR-chain). All four name the marker inside a `WHERE`; whether
 * that mention RESTRICTS the result depends on its position in the boolean
 * expression, so the WHERE body is evaluated as a `NOT`/`AND`/`OR` tree rather
 * than substring-matched.
 */
const classifyAgentAlertRetrievals = (
  steps: AttackDiscoveryAgentBuilderTaskOutput['steps'],
  retrievalScope: string | null
): { scoped: AgentEsqlResult[]; unscoped: AgentEsqlResult[] } => {
  const scoped: AgentEsqlResult[] = [];
  const unscoped: AgentEsqlResult[] = [];

  for (const result of collectAgentEsqlResults(steps)) {
    if (readsAlertsIndex(result)) {
      (carriesRetrievalScope(result.query, retrievalScope) ? scoped : unscoped).push(result);
    }
  }

  return { scoped, unscoped };
};

/**
 * The observed population of the example's SCOPED alerts retrievals: the
 * DISTINCT alert ids they returned, unioned across retrievals. The scored
 * question is whether the run reached the seeded population, so the union is
 * the reading to compare against `expectedRetrievedAlertCount`.
 *
 * One result's row count is not that population when the retrieval is split:
 * two correct scoped calls returning 50 and 45 distinct alerts of a 95-alert
 * fixture have observed all 95, and reading either alone scores the run as a
 * failure. The recorded ES|QL payload carries `_id` per row, so the identities
 * are there to union.
 *
 * Only a result that CARRIES `_id` can support a distinct-alert population. A
 * result without that column has rows whose identities are unknown, and its
 * row count is not a count of distinct alerts: ES|QL transformations such as
 * `MV_EXPAND` or an aggregation produce rows that are not one-to-one with the
 * alerts they came from, so admitting a row count let a scoped query over
 * FEWER distinct alerts score as a complete retrieval — the exact population
 * assertion this profile exists to make. Such a result therefore contributes
 * NOTHING to the population and is kept only as diagnostics
 * (`extractAgentEsqlRowCounts`), which can only undercount.
 *
 * `null` when the example's scoped retrievals yielded no verifiable identity at
 * all (every one omitted `_id`), and when the example ran no scoped alerts
 * retrieval (an unscoped-only run observes none of this fixture's population;
 * see `computeWorkflowAlertCounts` for what that scores).
 */
export const extractAgentAlertRetrievalPopulation = (
  steps: AttackDiscoveryAgentBuilderTaskOutput['steps'],
  retrievalScope: string | null = null
): number | null => {
  const { scoped } = classifyAgentAlertRetrievals(steps, retrievalScope);
  if (scoped.length === 0) return null;

  const idBearing = scoped.filter(
    (result): result is AgentEsqlResult & { alertIds: string[] } => result.alertIds !== null
  );
  if (idBearing.length === 0) return null;

  const ids = new Set<string>();
  for (const result of idBearing) {
    for (const id of result.alertIds) ids.add(id);
  }

  return ids.size;
};

/**
 * Row counts of the alerts-index retrievals that did NOT carry the example's
 * scope — the ones `extractAgentAlertRetrievalPopulation` excludes, and which
 * therefore contribute no observed population. Persisted as evidence so a
 * scored 0 reads as "the agent retrieved N rows unscoped" rather than "the
 * agent did not retrieve": those are different findings, and only the second
 * is an absent retrieval rather than a scope violation. Always empty when the
 * example declares no scope, since nothing can then be out of scope.
 */
export const extractUnscopedAlertRetrievalRowCounts = (
  steps: AttackDiscoveryAgentBuilderTaskOutput['steps'],
  retrievalScope: string | null = null
): number[] =>
  classifyAgentAlertRetrievals(steps, retrievalScope).unscoped.map((result) => result.rowCount);

/**
 * The ES|QL query the agent handed `security.attack-discovery.run`
 * (`params.esql_query`), when it supplied one. The pipeline's Alert Retrieval
 * phase runs THAT query, so this is the observable that proves whether a
 * pipeline-derived count is scoped — the same way the agent's own ES|QL
 * results prove it for its retrievals. `null` when the call supplied no query
 * (the tool's own unscoped default query is then what ran).
 *
 * The FIRST AD call is the one whose execution the pipeline response is read
 * for (`findAdToolResult`), so it is the one whose query is returned.
 */
export const extractAdToolEsqlQuery = (
  steps: AttackDiscoveryAgentBuilderTaskOutput['steps']
): string | null => {
  const adStep = (steps ?? []).find((step) => step?.tool_id === 'security.attack-discovery.run');
  const params = (adStep?.params ?? {}) as { esql_query?: unknown };

  return getString(params.esql_query);
};

/**
 * `alert_retrieval` extraction strategies that are NOT retrievals:
 *
 * - `provided` — the route's provided-alert reconstruction, which writes the
 *   alert set the model SUPPLIED into the retrieval block
 *   (`get_pipeline_data.ts` Step 2.5, `alerts_context_count: providedAlerts.length`).
 *   That branch is unreachable at this revision; making it reachable must not
 *   turn the supplied count into a retrieved one, so the exclusion is required
 *   rather than defensive.
 * - `skill` — the gate (skill) decision run, merged into `alert_retrieval` by
 *   Step 5b with the alert set PASSED to generation.
 *
 * Reading either as "retrieved" answers "how many alerts did the model hand
 * over" instead of "how many did it retrieve".
 */
const NON_RETRIEVAL_STRATEGIES: ReadonlySet<string> = new Set(['provided', 'skill']);

/** Which observable produced the count, for the evidence metadata. The last
 *  two cases are the two ways a scoped example observes none of its
 *  population: a retrieval that happened but carried no scope
 *  (`unscoped_retrieval`), and no alerts retrieval at all (`none`) — both
 *  score 0, and the source is what tells them apart in the record. */
const resolveRetrievedAlertCountSource = ({
  fromAlertRetrieval,
  fromCombinedAlerts,
  fromAgentRetrieval,
  onlyUnscopedRetrievals,
}: {
  fromAlertRetrieval: number | null;
  fromCombinedAlerts: number | null;
  fromAgentRetrieval: number | null;
  onlyUnscopedRetrievals: boolean;
}): RetrievedAlertCountSource => {
  if (fromAlertRetrieval != null) return 'pipeline_alert_retrieval';
  if (fromCombinedAlerts != null) return 'pipeline_combined_alerts';
  if (fromAgentRetrieval != null) return 'agent_esql_retrieval';
  if (onlyUnscopedRetrievals) return 'unscoped_retrieval';
  return 'none';
};

// The per-workflow count (`alert_retrieval[0]`) may be missing for some
// retrieval paths (e.g. live-retrieval through the agent's own ES|QL
// tooling), so fall back to `combined_alerts.alerts_context_count`.
// `computeCombinedAlerts` (compute_combined_alerts/index.ts) sums ONLY the
// Alert-retrieval-phase results — `get_pipeline_data.ts` (Step 5) excludes
// gate entries by construction ("Combined alert retrieval view stays
// scoped to alert retrieval") — so this is a RETRIEVED count, never a
// passed one. `adToolResult.alertsContextCount` is the opposite: it comes
// from `alertRetrievalResult.alertsContextCount` assigned in
// run_manual_orchestration/index.ts AFTER the gate runs, i.e. the exact
// candidate set handed to generation as `additional_alerts` — a PASSED
// count. The two must not share a fallback (Fix 1); when no pipeline source
// has a value we fall back to the agent's own retrieval (`provided` mode
// skips retrieval by design) and, failing that, leave `retrievedAlertCount`
// `null` rather than manufacturing it from the passed count.
//
// BOTH sides of that fallback answer the same question — how much of THIS
// fixture's population did the run observe — so both are held to the
// example's declared scope. The pipeline's Alert Retrieval phase runs the
// query the agent handed the AD tool (`params.esql_query`), which is
// observable at the call site, so a pipeline count is admitted only when that
// query carries `retrievalScope`; the excluded ones come back as
// `unscopedPipelineAlertRetrievalCounts` for the evidence block.
//
// A run that observed NONE of the fixture's population scores 0, not `null`.
// The count is defined as "alerts of this fixture observed", so 0 is the
// truthful reading, and `null` would let a model take `N/A` (dropped from the
// aggregate) instead of failing the retrieval the example's question asked
// for. Two ways to observe none are both failures of that one assertion, and
// both score 0: retrieving without the declared scope, and not retrieving at
// all — the second is why the gate is `retrievalScope`, not "some unscoped
// retrieval happened". `null` stays reserved for an example that asks no
// retrieval question (no declared scope, hence no expected population), where
// there is genuinely nothing to score.
export const computeWorkflowAlertCounts = ({
  pipeline,
  adToolResult,
  adToolEsqlQuery = null,
  retrievalScope = null,
  agentAlertRetrievalPopulation = null,
  unscopedAgentAlertRetrievalRowCounts = [],
}: {
  pipeline: AttackDiscoveryPipelineResponse;
  adToolResult?: AttackDiscoveryAgentBuilderTaskOutput['adToolResult'];
  /** The query the agent handed the AD tool (`params.esql_query`), when it
   *  supplied one: the pipeline's own retrieval runs it. */
  adToolEsqlQuery?: string | null;
  /** The marker the example's retrievals had to carry; `null` when the example
   *  declares none, in which case nothing can be out of scope. */
  retrievalScope?: string | null;
  /** The population the example's SCOPED retrievals observed, already unioned
   *  across them (`extractAgentAlertRetrievalPopulation`); `null` when the run
   *  made no scoped retrieval. */
  agentAlertRetrievalPopulation?: number | null;
  /** Row counts of the agent's alerts-index retrievals that did NOT carry the
   *  scope: non-empty means the run retrieved, but not under this fixture's
   *  marker. */
  unscopedAgentAlertRetrievalRowCounts?: number[];
}): {
  retrievedAlertCount: number | null;
  retrievedAlertCountSource: RetrievedAlertCountSource;
  passedAlertCount: number | null;
  /** Pipeline counts that were NOT admitted because the AD call's query did not
   *  carry `retrievalScope`. Diagnostic only — nothing scores them. */
  unscopedPipelineAlertRetrievalCounts: number[];
} => {
  const entries = pipeline.alert_retrieval ?? null;
  const retrievalEntries = (entries ?? []).filter(
    (entry) => !NON_RETRIEVAL_STRATEGIES.has(getString(entry?.extraction_strategy) ?? '')
  );
  // Every entry the response carried is a supplied/passed one, so the
  // `combined_alerts` view — built from those same entries — is a supplied
  // count too, and is not a fallback here.
  const carriesOnlyNonRetrievalEntries =
    entries != null && entries.length > 0 && retrievalEntries.length === 0;

  const fromAlertRetrieval = getNumber(retrievalEntries[0]?.alerts_context_count);
  const fromCombinedAlerts = carriesOnlyNonRetrievalEntries
    ? null
    : getNumber(pipeline.combined_alerts?.alerts_context_count);

  // The pipeline's own retrieval runs this query, so when the example declares a
  // scope that query has to clear the same bar as an agent-side retrieval:
  // carry the scope AND read the alerts index. Scope alone admitted a count from
  // any marker-bearing source — `FROM logs-endpoint.events.process-default |
  // WHERE labels.ad_portable_seed == "<marker>"` is scoped but counts seeded
  // RAW EVENTS, and an exact-looking count from those passed the fixture's
  // population assertion without any alert being retrieved.
  //
  // With NO scope declared there is nothing to gate: the check belongs to the
  // example, so the count is admitted exactly as before.
  const pipelineCountCarriesScope =
    retrievalScope == null ||
    (carriesRetrievalScope(adToolEsqlQuery, retrievalScope) &&
      readsAlertsIndexQuery(adToolEsqlQuery));
  const admittedFromAlertRetrieval = pipelineCountCarriesScope ? fromAlertRetrieval : null;
  const admittedFromCombinedAlerts = pipelineCountCarriesScope ? fromCombinedAlerts : null;
  const unscopedPipelineAlertRetrievalCounts = pipelineCountCarriesScope
    ? []
    : [fromAlertRetrieval, fromCombinedAlerts].filter((count): count is number => count != null);

  const onlyUnscopedRetrievals =
    retrievalScope != null &&
    (unscopedAgentAlertRetrievalRowCounts.length > 0 ||
      unscopedPipelineAlertRetrievalCounts.length > 0);

  // A scoped example asserts a retrieved population, so a run that had no
  // count admitted observed none of it — 0, whether it retrieved unscoped or
  // not at all. See the gate's doc block above.
  const observedNoneOfThePopulation = retrievalScope != null;

  return {
    retrievedAlertCount:
      admittedFromAlertRetrieval ??
      admittedFromCombinedAlerts ??
      agentAlertRetrievalPopulation ??
      (observedNoneOfThePopulation ? 0 : null),
    retrievedAlertCountSource: resolveRetrievedAlertCountSource({
      fromAlertRetrieval: admittedFromAlertRetrieval,
      fromCombinedAlerts: admittedFromCombinedAlerts,
      fromAgentRetrieval: agentAlertRetrievalPopulation,
      onlyUnscopedRetrievals,
    }),
    passedAlertCount: adToolResult?.alertsContextCount ?? null,
    unscopedPipelineAlertRetrievalCounts,
  };
};

/**
 * The pipeline-response facts behind the counts above, persisted on the task
 * output so the next `null` is diagnosable from the record instead of from the
 * product source. Purely additive: no evaluator reads it to score, and no raw
 * alert text or execution id is copied (only counts, strategy names and stage
 * booleans).
 */
export const extractRetrievalEvidence = ({
  pipeline,
  agentEsqlRowCounts = [],
  retrievalScope = null,
  unscopedAgentAlertRetrievalRowCounts = [],
  unscopedPipelineAlertRetrievalCounts = [],
}: {
  pipeline?: AttackDiscoveryPipelineResponse | null;
  agentEsqlRowCounts?: number[];
  retrievalScope?: string | null;
  unscopedAgentAlertRetrievalRowCounts?: number[];
  unscopedPipelineAlertRetrievalCounts?: number[];
}): AttackDiscoveryRetrievalEvidence => {
  const entries = pipeline?.alert_retrieval;
  const combined = pipeline?.combined_alerts ?? null;

  return {
    alertRetrievalMode: getString(pipeline?.diagnostics_context?.config?.alertRetrievalMode),
    pipelineAlertRetrieval: Array.isArray(entries)
      ? entries.map((entry) => ({
          alertsContextCount: getNumber(entry?.alerts_context_count),
          extractionStrategy: getString(entry?.extraction_strategy),
          alertsCount: Array.isArray(entry?.alerts) ? entry.alerts.length : null,
        }))
      : null,
    pipelineCombinedAlerts:
      combined == null
        ? null
        : {
            alertsContextCount: getNumber(combined.alerts_context_count),
            alertsCount: Array.isArray(combined.alerts) ? combined.alerts.length : null,
          },
    workflowExecutionsTrackingKeys: trackedStageKeys(pipeline?.workflow_executions_tracking),
    agentEsqlRowCounts,
    retrievalScope,
    unscopedAgentAlertRetrievalRowCounts,
    unscopedPipelineAlertRetrievalCounts,
  };
};

/**
 * The task output's `workflow` block: the pipeline response when there is one,
 * and the agent's own retrieval when there is not — a `provided`-mode run has
 * no pipeline count by design, which is exactly the case the recorded steps
 * answer.
 */
export const buildWorkflow = ({
  pipeline,
  adToolResult,
  agentEsqlRowCounts,
  adToolEsqlQuery = null,
  agentAlertRetrievalPopulation = null,
  retrievalScope = null,
  unscopedAgentAlertRetrievalRowCounts = [],
}: {
  pipeline: AttackDiscoveryPipelineResponse | null;
  adToolResult?: AttackDiscoveryAgentBuilderTaskOutput['adToolResult'];
  agentEsqlRowCounts: number[];
  adToolEsqlQuery?: string | null;
  agentAlertRetrievalPopulation?: number | null;
  retrievalScope?: string | null;
  unscopedAgentAlertRetrievalRowCounts?: number[];
}): AttackDiscoveryAgentBuilderTaskOutput['workflow'] => {
  const {
    retrievedAlertCount,
    retrievedAlertCountSource,
    passedAlertCount,
    unscopedPipelineAlertRetrievalCounts,
  } = computeWorkflowAlertCounts({
    pipeline: pipeline ?? {},
    adToolResult,
    adToolEsqlQuery,
    retrievalScope,
    agentAlertRetrievalPopulation,
    unscopedAgentAlertRetrievalRowCounts,
  });

  return {
    stages: trackedStages(pipeline?.workflow_executions_tracking),
    retrievedAlertCount,
    retrievedAlertCountSource,
    passedAlertCount,
    validatedDiscoveryCount: Array.isArray(pipeline?.validated_discoveries)
      ? pipeline.validated_discoveries.length
      : adToolResult?.discoveryCount ?? null,
    retrievalEvidence: extractRetrievalEvidence({
      pipeline,
      agentEsqlRowCounts,
      retrievalScope,
      unscopedAgentAlertRetrievalRowCounts,
      unscopedPipelineAlertRetrievalCounts,
    }),
  };
};

/**
 * Slow-path handoff handling (#293046): when generation exceeds the sync tool's
 * 90s soft deadline, the converse returns `{ execution_uuid }` while the
 * pipeline keeps running in the background. The validation phase is the LAST
 * pipeline phase, so `tracking.validation` becomes non-null only once generation
 * has produced output. Poll tracking until that happens (bounded), so the
 * pipeline response read afterwards reflects the completed run instead of a
 * mid-flight snapshot. A 404 means the execution has not been indexed into the
 * event log yet — keep polling, the deadline handoff commonly wins that race.
 * Budget: 90s soft deadline + observed ~80s generation tail, with headroom —
 * a 170s completion would miss a 120s budget (observed in run-29 rep 1).
 */
// Safety valve only — the loop exits on the validation workflow's terminal
// status, not on this deadline; a wedged run must not hang the suite. The
// default is deliberately generous (10 min) so slow models (OSS models on
// eval cells routinely exceed 180s) are not falsely truncated; the observed
// gpt-5.2 tail is 90s deadline + ~80s generation. Override per environment
// (e.g. known-fast stacks) with AD2_VALIDATION_WAIT_TIMEOUT_MS.
const DEFAULT_WAIT_FOR_VALIDATION_PHASE_TIMEOUT_MS = 600_000;
const WAIT_FOR_VALIDATION_PHASE_TIMEOUT_MS = Number.isFinite(
  Number(process.env.AD2_VALIDATION_WAIT_TIMEOUT_MS)
)
  ? Number(process.env.AD2_VALIDATION_WAIT_TIMEOUT_MS)
  : DEFAULT_WAIT_FOR_VALIDATION_PHASE_TIMEOUT_MS;
const WAIT_FOR_VALIDATION_PHASE_INTERVAL_MS = 5_000;

export { WAIT_FOR_VALIDATION_PHASE_TIMEOUT_MS, WAIT_FOR_VALIDATION_PHASE_INTERVAL_MS };

/**
 * Maps a pipeline `validated_discoveries` entry (snake_case API shape with
 * `alert_ids`, plus `title`/`summary`-style prose fields) into the harness
 * `AttackDiscovery` shape the insight-based evaluators consume. Only fields
 * with an unambiguous equivalent are mapped; everything else is omitted
 * rather than guessed.
 */
export const insightsFromValidatedDiscoveries = (
  validated: unknown[] | null | undefined
): AttackDiscovery[] | undefined => {
  if (!Array.isArray(validated)) return undefined;
  return validated.map((entry) => {
    const d = (entry ?? {}) as Record<string, unknown>;
    return {
      title: typeof d.title === 'string' ? d.title : '',
      // The evaluator's shape contract (AttackDiscoveryBasic) requires
      // non-empty summaryMarkdown and detailsMarkdown; the pipeline persists
      // snake_case fields. Missing strings become '' so the evaluator scores
      // the shape honestly instead of us fabricating content.
      summaryMarkdown: typeof d.summary_markdown === 'string' ? d.summary_markdown : '',
      detailsMarkdown: typeof d.details_markdown === 'string' ? d.details_markdown : '',
      // Same unambiguous-equivalent rule: pass the pipeline's entity summary
      // through when present; omit rather than fabricate. The rubric evaluator
      // reads entitySummaryMarkdown and degrades to '' when absent.
      ...(typeof d.entity_summary_markdown === 'string'
        ? { entitySummaryMarkdown: d.entity_summary_markdown }
        : {}),
      alertIds: Array.isArray(d.alert_ids) ? (d.alert_ids as string[]) : [],
    } as AttackDiscovery;
  });
};

interface ExecutionTrackingWorkflowSnapshot {
  workflow_id?: string;
  workflow_run_id?: string;
}

interface ExecutionTrackingResponse {
  generation?: ExecutionTrackingWorkflowSnapshot | null;
  validation?: ExecutionTrackingWorkflowSnapshot | null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Only the EXPECTED not-yet-indexed failures are retryable. The Kibana http
 * layer surfaces an error response as an `IHttpFetchError` carrying the raw
 * `Response`; a 401/403 can never succeed on retry, so burning the whole
 * budget on them only delays surfacing the authorization/configuration
 * failure (and masks it behind a misleading `never became trackable`).
 */
const PERMANENT_HTTP_STATUSES = new Set([400, 401, 403, 405, 410, 499, 501]);

const isPermanentHttpError = (error: unknown): boolean => {
  if (error == null || typeof error !== 'object') return false;
  const response = (error as { response?: { status?: unknown } }).response;
  const status = response?.status;
  return typeof status === 'number' && PERMANENT_HTTP_STATUSES.has(status);
};

/**
 * A non-null `tracking.validation` means the validation phase has STARTED (the
 * product writes the workflow tracking into the event log before the workflow
 * runs — see `writeValidationStartedEvent`), not that it has finished. Reading
 * the pipeline at that point can snapshot it mid-validation, where
 * `validated_discoveries` is absent or incomplete. Probing the validation
 * workflow run itself is the product's own completion signal
 * (`pollForWorkflowCompletion` reads the same engine status); the run's status
 * must reach a terminal value before the single pipeline snapshot below is
 * safe to take.
 */
const VALIDATION_TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

// workflow_run_id -> terminal status observed. Cached so a timed-out poll does
// not re-probe the same run.
const validationRunTerminal = new Map<string, boolean>();

const isValidationFinished = (validation: unknown): boolean => {
  if (validation == null || typeof validation !== 'object') return false;
  const runId = (validation as ExecutionTrackingWorkflowSnapshot).workflow_run_id;
  // A snapshot without a run id carries nothing beyond non-null to observe, so
  // treat "tracked" as done (the pre-fix behavior for that legacy shape).
  if (typeof runId !== 'string' || runId.length === 0) return true;
  return validationRunTerminal.get(runId) === true;
};

export const waitForValidationPhase = async ({
  fetch,
  executionId,
  executionFailed = false,
}: {
  fetch: HttpHandler;
  executionId: string;
  /**
   * The AD tool reported a terminal failure for this execution (`adToolResult.status`).
   * Validation runs after generation in the same pipeline, so a failed run never
   * reaches it and `tracking.validation` stays null — there is nothing to wait for.
   */
  executionFailed?: boolean;
}): Promise<ExecutionTrackingResponse> => {
  const deadline = Date.now() + WAIT_FOR_VALIDATION_PHASE_TIMEOUT_MS;
  let lastError: unknown;
  let lastTracking: ExecutionTrackingResponse | null = null;
  for (;;) {
    let tracking: ExecutionTrackingResponse | null = lastTracking;
    try {
      tracking = (await fetch(`/internal/attack_discovery/executions/${executionId}/tracking`, {
        method: 'GET',
        headers: { 'elastic-api-version': '1' },
      })) as ExecutionTrackingResponse;
      lastTracking = tracking;
    } catch (error) {
      lastError = error;
      // A permanent HTTP failure (401/403/…, unlike the expected
      // not-yet-indexed 404 or a transient network error) can never succeed on
      // retry — surface it immediately instead of looping the full budget and
      // reporting `never became trackable`. An earlier usable snapshot is
      // still returned, same as the deadline path.
      if (isPermanentHttpError(error)) {
        if (lastTracking) {
          return lastTracking;
        }
        throw new Error(
          `Attack Discovery execution ${executionId} tracking request failed permanently`,
          { cause: error }
        );
      }
    }
    if (tracking && tracking.validation != null) {
      if (isValidationFinished(tracking.validation)) {
        return tracking;
      }
      // Validation has started but its workflow run is still in flight. Probe
      // the run status the product's own poller reads; once terminal, the next
      // loop pass returns the (re-fetched) tracking snapshot.
      const runId = tracking.validation.workflow_run_id;
      if (runId) {
        try {
          const run = (await fetch(`/api/workflows/executions/${encodeURIComponent(runId)}`, {
            method: 'GET',
            headers: { 'elastic-api-version': '2023-10-31' },
          })) as { status?: string } | null;
          if (run?.status && VALIDATION_TERMINAL_STATUSES.has(run.status)) {
            validationRunTerminal.set(runId, true);
          }
        } catch (probeError) {
          // Status probe is best-effort: a 404 (run not indexed yet) or a
          // transient failure just means "not terminal yet" — keep polling.
          // A permanent failure (401/403/…) can never succeed on retry, so
          // surface it as the tracking GET above does rather than burning
          // the whole budget and scoring a possibly incomplete pipeline.
          if (isPermanentHttpError(probeError)) {
            if (lastTracking) {
              return lastTracking;
            }
            throw new Error(
              `Attack Discovery execution ${executionId} validation status probe failed permanently`,
              { cause: probeError }
            );
          }
        }
      }
    }
    // The execution terminally failed before the validation phase, so
    // `tracking.validation` can never become non-null. Return the snapshot we
    // have rather than poll for the rest of the budget on a predicate that can
    // no longer be satisfied — a wedged run must not stall the suite.
    if (executionFailed && tracking?.validation == null) {
      if (lastTracking) {
        return lastTracking;
      }
      throw new Error(
        `Attack Discovery execution ${executionId} failed before reaching the validation phase`,
        { cause: lastError }
      );
    }
    if (Date.now() >= deadline) {
      if (lastTracking) {
        // Timed out still waiting: return the LAST SUCCESSFUL snapshot rather
        // than failing the run — a final failed GET must not discard an
        // earlier usable generation snapshot. The caller reads whatever
        // pipeline state exists, and the evaluators score that honestly.
        return lastTracking;
      }
      throw new Error(
        `Attack Discovery execution ${executionId} never became trackable within ${WAIT_FOR_VALIDATION_PHASE_TIMEOUT_MS}ms`,
        { cause: lastError }
      );
    }
    await sleep(WAIT_FOR_VALIDATION_PHASE_INTERVAL_MS);
  }
};
const inspectWorkflow = async ({
  fetch,
  executionId,
  adToolResult,
  agentEsqlRowCounts,
  adToolEsqlQuery,
  agentAlertRetrievalPopulation,
  retrievalScope,
  unscopedAgentAlertRetrievalRowCounts,
}: {
  fetch: HttpHandler;
  executionId: string;
  adToolResult?: AttackDiscoveryAgentBuilderTaskOutput['adToolResult'];
  agentEsqlRowCounts: number[];
  adToolEsqlQuery: string | null;
  agentAlertRetrievalPopulation: number | null;
  retrievalScope: string | null;
  unscopedAgentAlertRetrievalRowCounts: number[];
}): Promise<{
  workflow: AttackDiscoveryAgentBuilderTaskOutput['workflow'];
  pipeline: AttackDiscoveryPipelineResponse | null;
}> => {
  const tracking = await waitForValidationPhase({
    fetch,
    executionId,
    executionFailed: adToolResult?.status === 'error',
  });
  const workflowId = tracking.generation?.workflow_id;
  const pipeline = workflowId
    ? ((await fetch(`/internal/attack_discovery/workflow/${workflowId}/execution/${executionId}`, {
        method: 'GET',
        headers: { 'elastic-api-version': '1' },
      })) as AttackDiscoveryPipelineResponse)
    : null;

  // Without a generation workflow there is no pipeline response to read, but the
  // agent's own retrieval (recorded in `steps`) is still observable — which is
  // the whole point of `buildWorkflow` taking a nullable pipeline.
  return {
    pipeline,
    workflow: buildWorkflow({
      pipeline,
      adToolResult,
      agentEsqlRowCounts,
      adToolEsqlQuery,
      agentAlertRetrievalPopulation,
      retrievalScope,
      unscopedAgentAlertRetrievalRowCounts,
    }),
  };
};

const buildTask =
  ({
    chatClient,
    fetch,
  }: {
    chatClient: AttackDiscoveryAgentBuilderChatClient;
    fetch: HttpHandler;
  }): ExperimentTask<AttackDiscoveryAgentBuilderExample, AttackDiscoveryAgentBuilderTaskOutput> =>
  async ({ input }) => {
    const response = await chatClient.converse(
      input?.question ?? '',
      input?.attachments,
      input?.expectedSkills
    );
    const adToolResult = findAdToolResult(response.steps);
    // The agent's own retrieval, read from the recorded steps: in `provided`
    // mode this is the only observable retrieval source (the pipeline skips the
    // retrieval phase by design, so its response carries no retrieved count).
    // `retrievalScope` is the marker the example's question instructs the agent
    // to retrieve by; a retrieval that does not carry it is not this fixture's
    // population and produces no count (see `extractAgentAlertRetrievalPopulation`).
    // The same marker is checked against the query the agent handed the AD tool
    // (`adToolEsqlQuery`), because the pipeline's own retrieval runs that query
    // — so both sides of the fallback are held to one scope (Fix 3).
    const retrievalScope = input?.retrievalScope ?? null;
    const adToolEsqlQuery = extractAdToolEsqlQuery(response.steps);
    const agentEsqlRowCounts = extractAgentEsqlRowCounts(response.steps);
    const agentAlertRetrievalPopulation = extractAgentAlertRetrievalPopulation(
      response.steps,
      retrievalScope
    );
    const unscopedAgentAlertRetrievalRowCounts = extractUnscopedAlertRetrievalRowCounts(
      response.steps,
      retrievalScope
    );
    const executionId = adToolResult?.executionUuid;
    const { workflow, pipeline } = executionId
      ? await inspectWorkflow({
          executionId,
          adToolResult,
          fetch,
          agentEsqlRowCounts,
          adToolEsqlQuery,
          agentAlertRetrievalPopulation,
          retrievalScope,
          unscopedAgentAlertRetrievalRowCounts,
        })
      : {
          workflow: buildWorkflow({
            pipeline: null,
            adToolResult,
            agentEsqlRowCounts,
            adToolEsqlQuery,
            agentAlertRetrievalPopulation,
            retrievalScope,
            unscopedAgentAlertRetrievalRowCounts,
          }),
          pipeline: null,
        };
    return {
      ...response,
      // Slow-path handoff (#293046): when the sync tool returns the
      // `{ execution_uuid }` handoff at its 90s soft deadline, the converse
      // response carries no insights even though generation completes in the
      // background moments later. Fall back to the pipeline's validated
      // discoveries (mapped to the harness `AttackDiscovery` shape) so
      // insight-based evaluators (NoiseFalsePositive, AttackDiscoveryBasic)
      // score the completed run rather than the handoff stub. A run whose
      // discoveries were all hallucination-filtered legitimately yields an
      // empty array — do not fabricate.
      insights:
        response.insights ?? insightsFromValidatedDiscoveries(pipeline?.validated_discoveries),
      // Redact transient execution UUIDs from steps and adToolResult before
      // they reach evaluators — these are per-run values that would pollute
      // score reports and make diff comparisons noisy.
      steps: redactExecutionIds(response.steps) as typeof response.steps,
      adToolResult: adToolResult
        ? {
            status: adToolResult.status,
            executionUuid: undefined,
            alertsContextCount: adToolResult.alertsContextCount,
            discoveryCount: adToolResult.discoveryCount,
          }
        : undefined,
      workflow,
    };
  };

export const createEvaluateAttackDiscoveryAgentBuilderDataset =
  ({
    chatClient,
    fetch,
    evaluators,
    executorClient,
    traceEsClient,
  }: {
    chatClient: AttackDiscoveryAgentBuilderChatClient;
    fetch: HttpHandler;
    evaluators: DefaultEvaluators;
    executorClient: EvalsExecutorClient;
    traceEsClient: EsClient;
  }) =>
  async ({
    dataset,
  }: {
    dataset: { name: string; description: string; examples: AttackDiscoveryAgentBuilderExample[] };
  }) => {
    const trajectory = createStrictTrajectoryEvaluator({
      extractToolCalls: (output) =>
        getToolCallSteps(output)
          .map((step) => step.tool_id)
          .filter(Boolean) as string[],
      goldenPathExtractor: (expected) =>
        (expected as { expectedToolPath?: string[] })?.expectedToolPath ?? [],
    });
    const traceEvaluators = evaluators.traceBasedEvaluators;
    await executorClient.runExperiment(
      { datasets: [dataset], task: buildTask({ chatClient, fetch }) },
      [
        createAdToolResultEvaluator(),
        createWorkflowEvidenceEvaluator(),
        trajectory,
        createForbiddenToolsEvaluator(),
        createNoiseFalsePositiveEvaluator(),
        createDiscoveryCountCapEvaluator(),
        createMinValidatedDiscoveryEvaluator(),
        createCostPerAlertEvaluator(),
        createAttackDiscoveryBasicEvaluator(),
        createAttackDiscoveryCriteriaEvaluator({ evaluators }) as Evaluator<
          AttackDiscoveryAgentBuilderExample,
          AttackDiscoveryAgentBuilderTaskOutput
        >,
        createAttackDiscoveryRubricEvaluator({ evaluators }) as Evaluator<
          AttackDiscoveryAgentBuilderExample,
          AttackDiscoveryAgentBuilderTaskOutput
        >,
        traceEvaluators.toolCalls as Evaluator<
          AttackDiscoveryAgentBuilderExample,
          AttackDiscoveryAgentBuilderTaskOutput
        >,
        traceEvaluators.latency as Evaluator<
          AttackDiscoveryAgentBuilderExample,
          AttackDiscoveryAgentBuilderTaskOutput
        >,
        traceEvaluators.inputTokens as Evaluator<
          AttackDiscoveryAgentBuilderExample,
          AttackDiscoveryAgentBuilderTaskOutput
        >,
        traceEvaluators.outputTokens as Evaluator<
          AttackDiscoveryAgentBuilderExample,
          AttackDiscoveryAgentBuilderTaskOutput
        >,
        createResponseSkillInvocationEvaluator() as Evaluator<
          AttackDiscoveryAgentBuilderExample,
          AttackDiscoveryAgentBuilderTaskOutput
        >,
      ]
    );
  };
