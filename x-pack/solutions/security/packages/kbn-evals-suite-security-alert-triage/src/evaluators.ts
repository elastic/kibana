/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getToolCallSteps, type TaskOutput } from '@kbn/evals';
import {
  attachmentTools,
  internalTools,
  platformCoreTools,
  ToolResultType,
} from '@kbn/agent-builder-common';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * CODE evaluator: scores whether the LLM called attachment_read the expected
 * number of times. Returns score=1 (pass) when the example metadata does not
 * set expectedAttachmentReads, so it can be included in eval suites that mix
 * inline-mode (no reads expected) and summary-mode (reads required) scenarios.
 */
export const attachmentReadCompliance = {
  name: 'AttachmentReadCompliance',
  kind: 'CODE' as const,
  direction: 'maximize' as const,
  evaluate: async ({ output, metadata }: { output: unknown; metadata: unknown }) => {
    const expectedReads = (metadata as { expectedAttachmentReads?: number } | undefined)
      ?.expectedAttachmentReads;
    const expected = typeof expectedReads === 'number' ? expectedReads : 0;

    if (!expected) {
      return { score: 1 };
    }

    const toolCalls = getToolCallSteps(output as TaskOutput);
    const readCalls = toolCalls.filter((t) => t.tool_id === attachmentTools.read);

    return {
      score: Math.min(1, readCalls.length / expected),
      metadata: { readCallCount: readCalls.length, expected },
    };
  },
};

const SECURITY_ALERTS_TOOL_ID = 'security.alerts';

const createToolCallCountEvaluator = (name: string, toolId: string) => ({
  name,
  kind: 'CODE' as const,
  direction: 'minimize' as const,
  evaluate: async ({ output }: { output: unknown }) => {
    const count = getToolCallSteps(output as TaskOutput).filter((t) => t.tool_id === toolId).length;
    return { score: count };
  },
});

/**
 * CODE evaluators for security-team#20696: count the calls that the alert-analysis skill
 * used to cause on literal-following models, and log the ordered tool sequence of each run.
 */
export const createToolUsageEvaluators = (log: ToolingLog) => [
  createToolCallCountEvaluator('security.alerts calls', SECURITY_ALERTS_TOOL_ID),
  createToolCallCountEvaluator('search_relevant_skills calls', internalTools.searchRelevantSkills),
  createToolCallCountEvaluator('load_skill calls', internalTools.loadSkill),
  // security-team#21037 — queue questions must not spend tokens on these triage tools
  createToolCallCountEvaluator(
    'security.alert-analysis.get-related-alerts calls',
    'security.alert-analysis.get-related-alerts'
  ),
  createToolCallCountEvaluator(
    'security.security_labs_search calls',
    'security.security_labs_search'
  ),
  createToolCallCountEvaluator('security.get_entity calls', 'security.get_entity'),
  createToolCallCountEvaluator('platform.core.execute_esql calls', platformCoreTools.executeEsql),
  {
    name: 'Tool sequence (steps)',
    kind: 'CODE' as const,
    direction: 'minimize' as const,
    evaluate: async ({ output }: { output: unknown }) => {
      const sequence = getToolCallSteps(output as TaskOutput).map((t) => t.tool_id ?? 'unknown');
      log.info(`Tool sequence (${sequence.length}): ${sequence.join(' > ')}`);
      return { score: sequence.length, metadata: { sequence } };
    },
  },
];

interface RawToolStep {
  type?: string;
  tool_id?: string;
  params?: Record<string, unknown>;
  results?: Array<{ type?: string; data?: unknown }>;
}

// getToolCallSteps from @kbn/evals types the step results as unknown[]. These evaluators read result data.
const getRawToolSteps = (output: unknown): RawToolStep[] =>
  ((output as { steps?: RawToolStep[] })?.steps ?? []).filter((step) => step?.type === 'tool_call');

/**
 * CODE evaluator: 1 when the agent loaded the given skill with load_skill, and the tool returned the
 * skill. A failed call returns an error result, and does not count. The agent loads skills with this
 * tool, so it replaces the trace check that looks for a filestore.read of SKILL.md.
 */
export const createSkillLoadedEvaluator = (skillName: string) => ({
  name: `Skill loaded (${skillName})`,
  kind: 'CODE' as const,
  direction: 'maximize' as const,
  evaluate: async ({ output }: { output: unknown }) => {
    const loaded = getRawToolSteps(output).some(
      ({ tool_id: toolId, results = [] }) =>
        toolId === internalTools.loadSkill &&
        results.some(({ type, data }) => {
          const skill = (data as { skill?: { id?: string; name?: string } })?.skill;
          return (
            type === ToolResultType.other && (skill?.id === skillName || skill?.name === skillName)
          );
        })
    );
    return { score: loaded ? 1 : 0 };
  },
});

const MAX_EVIDENCE_ESQL_CALLS = 3;

// An ES|QL aggregate without BY returns one row even over zero matches (COUNT is 0, the others are
// null). A grouped aggregate returns no rows over zero matches, and a projected event row is a match
// whatever its values are, so `false` or `0` in an event field must still count.
// Quoted strings and backticked names are removed first, so a `|` or the word "by" inside them does
// not change how the commands are read.
const QUOTED_TEXT = /"(?:\\.|[^"\\])*"|`[^`]*`/g;

const isUngroupedAggregate = (query: string | undefined): boolean =>
  (query ?? '')
    .replace(QUOTED_TEXT, '""')
    .split('|')
    .map((command) => command.trim())
    .some((command) => /^STATS\b/i.test(command) && !/\bBY\b/i.test(command));

// In an ungrouped aggregate, a flag such as `hits > 0` is false over zero matches, so only a count
// above zero, a non-empty string or `true` shows that events matched.
const isAggregateEvidence = (cell: unknown): boolean => {
  if (Array.isArray(cell)) {
    return cell.some(isAggregateEvidence);
  }
  if (typeof cell === 'number') {
    return cell > 0;
  }
  if (typeof cell === 'string') {
    return cell !== '';
  }
  return cell === true;
};

const hasMatchingRow = (data: unknown): boolean => {
  const { query, values = [] } = (data ?? {}) as { query?: string; values?: unknown[][] };
  if (!isUngroupedAggregate(query)) {
    return values.length > 0;
  }
  return values.some((row) => row.some(isAggregateEvidence));
};

/**
 * CODE evaluator: 1 when the agent ran at least one ES|QL query that found at least one event, and ran
 * at most three ES|QL queries. Checks the evidence step from the tool steps, not from the answer. The
 * tool returns an `esql_results` entry even when `values` is empty, and an ungrouped aggregate over
 * zero matches returns a row of zeros, so a search over the wrong time window must not count as
 * finding the events.
 */
export const createEvidenceLookupEvaluator = (log: ToolingLog) => ({
  name: 'ES|QL evidence lookup (one query with data, at most three calls)',
  kind: 'CODE' as const,
  direction: 'maximize' as const,
  evaluate: async ({ output }: { output: unknown }) => {
    const esqlCalls = getRawToolSteps(output).filter(
      ({ tool_id: toolId }) => toolId === platformCoreTools.executeEsql
    );
    const succeeded = esqlCalls.filter(({ results = [] }) =>
      results.some(({ type, data }) => type === ToolResultType.esqlResults && hasMatchingRow(data))
    ).length;
    log.info(`ES|QL evidence calls: ${esqlCalls.length}, with data: ${succeeded}`);
    return {
      score: succeeded > 0 && esqlCalls.length <= MAX_EVIDENCE_ESQL_CALLS ? 1 : 0,
      metadata: { calls: esqlCalls.length, succeeded },
    };
  },
});

/**
 * CODE evaluator: the most ES|QL rows any single security.alerts call returned to the model, and
 * how many results told the model that the rows were cut. Shows whether the row cap ran.
 */
export const createAlertRowsEvaluator = (log: ToolingLog) => ({
  name: 'security.alerts rows (max per call)',
  kind: 'CODE' as const,
  direction: 'minimize' as const,
  evaluate: async ({ output }: { output: unknown }) => {
    const alertCalls = getRawToolSteps(output).filter(
      ({ tool_id: toolId }) => toolId === SECURITY_ALERTS_TOOL_ID
    );
    const rowCounts = alertCalls.map(({ results = [] }) =>
      results
        .filter(({ type }) => type === ToolResultType.esqlResults)
        .reduce(
          (total, { data }) => total + ((data as { values?: unknown[] })?.values?.length ?? 0),
          0
        )
    );
    const truncationNotes = alertCalls.reduce(
      (total, { results = [] }) =>
        total +
        results.filter(
          ({ type, data }) =>
            type === ToolResultType.other &&
            String((data as { message?: string })?.message ?? '').startsWith('Showing the first')
        ).length,
      0
    );
    log.info(
      `security.alerts calls: ${alertCalls.length}, rows per call: [${rowCounts.join(
        ', '
      )}], truncation notes: ${truncationNotes}`
    );
    return {
      score: rowCounts.length ? Math.max(...rowCounts) : 0,
      metadata: { rowCounts, truncationNotes },
    };
  },
});

/**
 * CODE evaluator: how many security.alerts calls asked for the summary detail, and the detail of every
 * call. Whether summary is right depends on the question, so the score has no direction.
 */
export const createAlertDetailEvaluator = (log: ToolingLog) => ({
  name: 'security.alerts summary detail calls',
  kind: 'CODE' as const,
  direction: 'neutral' as const,
  evaluate: async ({ output }: { output: unknown }) => {
    const details = getRawToolSteps(output)
      .filter(({ tool_id: toolId }) => toolId === SECURITY_ALERTS_TOOL_ID)
      .map(({ params }) => String(params?.detail ?? 'default'));
    log.info(`security.alerts detail per call: [${details.join(', ')}]`);
    return {
      score: details.filter((detail) => detail === 'summary').length,
      metadata: { details },
    };
  },
});
