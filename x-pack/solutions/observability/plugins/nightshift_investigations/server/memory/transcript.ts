/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { CORTEX_WORKSPACE_ROOT } from '../cortex/materialize';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { DECISION_TREE_WORKSPACE_ROOT } from '../decision_trees/materialize';
import { SIGNIFICANT_EVENTS_INVESTIGATION_PROGRESS_REPORT_TOOL_ID } from '../tools/investigation_progress_report/tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../tools/sandbox_bash/view_file_tool';

/**
 * The text the Semantic Memory critique, extraction, and writer calls read.
 *
 * Layout, in the order the model should weigh it:
 *  1. the user's task;
 *  2. the investigation, in order: the agent's short notes and every tool call with an excerpt of
 *     its result. Nothing is filtered by tool or path: the calls that read recalled memories or
 *     other stored knowledge show whether that knowledge was used, and the rest are the evidence
 *     for what is new, what to merge, and what was wrong;
 *  3. the final answer last, only when `answer` is given. It is a synthesis and can contain the
 *     agent's inferences, so the calls that write memories omit it.
 *
 * With `evidenceOnly`, calls that are not evidence are dropped with their results: reads of the
 * Cortex and decision-tree files Nightshift seeded into the sandbox, and the agent's progress
 * reports, which often restate them.
 *
 * When the persisted round cannot be read, the investigation is built from the hook's tool calls
 * and results, or falls back to tool-call parameters when no results were passed.
 */

export type TranscriptStep =
  | { kind: 'reasoning'; text: string }
  | {
      kind: 'tool';
      toolId: string;
      params: Record<string, unknown>;
      /** Excerpt source: the tool's output text, or its error message. */
      resultText?: string;
      isError: boolean;
    };

const MAX_TASK_CHARS = 4_000;
const MAX_ANSWER_CHARS = 12_000;
const MAX_INVESTIGATION_CHARS = 40_000;
const MAX_PARAMS_CHARS = 600;
const MAX_NOTE_CHARS = 400;
// Tried in order until the investigation fits its budget.
const RESULT_EXCERPT_CHARS = [1_500, 800, 400, 0];

const SEEDED_ROOTS = [CORTEX_WORKSPACE_ROOT, DECISION_TREE_WORKSPACE_ROOT];
// A bash command names a seeded directory by absolute or workspace-relative path.
const SEEDED_PATH_IN_COMMAND = new RegExp(
  `(?:^|[\\s'"=(:<])(?:/workspace/|\\./)?(?:${SEEDED_ROOTS.map((root) =>
    Path.posix.basename(root)
  ).join('|')})(?:/|[\\s'";|)&>]|$)`
);

export const readsSeededKnowledge = (toolId: string, params: Record<string, unknown>): boolean => {
  if (toolId === SANDBOX_VIEW_FILE_TOOL_ID && typeof params.file_path === 'string') {
    const resolved = Path.posix.resolve('/workspace', params.file_path);
    return SEEDED_ROOTS.some((root) => resolved === root || resolved.startsWith(`${root}/`));
  }
  return (
    toolId.endsWith('bash') &&
    typeof params.command === 'string' &&
    SEEDED_PATH_IN_COMMAND.test(params.command)
  );
};

const isEvidenceCall = (toolId: string, params: Record<string, unknown>): boolean =>
  toolId !== SIGNIFICANT_EVENTS_INVESTIGATION_PROGRESS_REPORT_TOOL_ID &&
  !readsSeededKnowledge(toolId, params);

const clip = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max)}… (+${text.length - max} chars)`;

const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

const renderParams = (toolId: string, params: Record<string, unknown>): string => {
  // A bash command is the meaningful part; show it as written rather than as escaped JSON.
  if (toolId.endsWith('bash') && typeof params.command === 'string') {
    const { command, ...rest } = params;
    const extras = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
    return clip(String(command).trim(), MAX_PARAMS_CHARS) + extras;
  }
  return clip(JSON.stringify(params ?? {}), MAX_PARAMS_CHARS);
};

interface Rendered {
  text: string;
  omitted: number;
}

const renderInvestigation = (
  steps: TranscriptStep[],
  excerptChars: number,
  noteMissingResults = true
): Rendered => {
  const entries: string[] = [];
  let n = 0;
  for (const step of steps) {
    if (step.kind === 'reasoning') {
      const note = oneLine(step.text);
      if (note.length > 0) {
        n += 1;
        entries.push(`${n}. Agent note: ${clip(note, MAX_NOTE_CHARS)}`);
      }
      continue;
    }
    n += 1;
    const lines = [`${n}. ${step.toolId}: ${renderParams(step.toolId, step.params)}`];
    if (step.resultText !== undefined && (step.isError || excerptChars > 0)) {
      const excerpt = clip(
        step.resultText.trim(),
        step.isError ? Math.min(excerptChars || 300, 600) : excerptChars
      );
      lines.push(
        `   ${step.isError ? 'ERROR' : 'Result'}: ${(excerpt || '(empty)').replace(/\n/g, '\n   ')}`
      );
    } else if (step.resultText === undefined && noteMissingResults) {
      lines.push('   Result: (not available)');
    }
    entries.push(lines.join('\n'));
  }

  let kept = entries.length;
  let text = entries.join('\n');
  while (text.length > MAX_INVESTIGATION_CHARS && kept > 0) {
    kept -= 1;
    text = entries.slice(0, kept).join('\n');
  }
  const omitted = entries.length - kept;
  if (omitted > 0) text += `\n(${omitted} later steps omitted)`;
  return { text: text.length > 0 ? text : '(no tool calls)', omitted };
};

const fitInvestigation = (steps: TranscriptStep[]): string => {
  let result = renderInvestigation(steps, RESULT_EXCERPT_CHARS[0]);
  for (const cap of RESULT_EXCERPT_CHARS.slice(1)) {
    if (result.omitted === 0) break;
    result = renderInvestigation(steps, cap);
  }
  return result.text;
};

export const renderMemoryTranscript = ({
  task,
  answer,
  investigation,
  toolCalls,
  evidenceOnly = false,
}: {
  task: string;
  answer?: string;
  /** Drop seeded Cortex and decision-tree reads and progress reports, with their results. */
  evidenceOnly?: boolean;
  /** The round's steps, in order, when the persisted round could be read. */
  investigation?: TranscriptStep[];
  /** Parameters-only fallback, used when `investigation` is unavailable. */
  toolCalls: InvestigationToolCall[];
}): string => {
  const steps = investigation?.filter(
    (step) => !evidenceOnly || step.kind !== 'tool' || isEvidenceCall(step.toolId, step.params)
  );
  const calls = toolCalls.filter(
    (call) => !evidenceOnly || isEvidenceCall(call.tool_id ?? 'unknown_tool', call.params ?? {})
  );
  // The parameters-only fallback lists the same calls, without results.
  const middle =
    steps !== undefined
      ? ['## Investigation', fitInvestigation(steps)]
      : [
          '## Tool calls (parameters only; results unavailable)',
          renderInvestigation(
            calls.map((call) => ({
              kind: 'tool' as const,
              toolId: call.tool_id ?? 'unknown_tool',
              params: call.params ?? {},
              isError: false,
            })),
            0,
            false
          ).text,
        ];
  return [
    '## User task',
    task.slice(0, MAX_TASK_CHARS),
    '',
    ...middle,
    ...(answer !== undefined ? ['', '## Final answer', answer.slice(0, MAX_ANSWER_CHARS)] : []),
  ].join('\n');
};

// --- Reading the persisted round -------------------------------------------------------------

interface RoundResult {
  type?: string;
  data?: unknown;
}

interface RoundStep {
  type?: string;
  reasoning?: string;
  tool_id?: string;
  params?: Record<string, unknown>;
  results?: RoundResult[];
}

const resultText = (results: RoundResult[] | undefined): { text?: string; isError: boolean } => {
  if (!results || results.length === 0) return { isError: false };
  const parts: string[] = [];
  let isError = false;
  for (const result of results) {
    const data = result.data;
    if (result.type === 'error') isError = true;
    if (typeof data === 'string') {
      parts.push(data);
    } else if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      const known = [record.message, record.text, record.stdout, record.stderr].filter(
        (value): value is string => typeof value === 'string' && value.length > 0
      );
      parts.push(known.length > 0 ? known.join('\n') : JSON.stringify(data));
    }
  }
  return { text: parts.join('\n'), isError };
};

/** Normalizes an Agent Builder round's steps (reasoning and tool calls) into transcript steps. */
export const stepsFromRound = (steps: readonly RoundStep[]): TranscriptStep[] => {
  const out: TranscriptStep[] = [];
  for (const step of steps) {
    if (step.type === 'reasoning' && typeof step.reasoning === 'string') {
      out.push({ kind: 'reasoning', text: step.reasoning });
    } else if (step.type === 'tool_call' && typeof step.tool_id === 'string') {
      const { text, isError } = resultText(step.results);
      out.push({
        kind: 'tool',
        toolId: step.tool_id,
        params: step.params ?? {},
        resultText: text,
        isError,
      });
    }
  }
  return out;
};

/**
 * Builds the investigation from the hook's tool calls when they carry results. It has no agent
 * notes, but each call shows what it returned.
 */
export const stepsFromToolCalls = (
  toolCalls: readonly InvestigationToolCall[]
): TranscriptStep[] | undefined => {
  if (!toolCalls.some((call) => call.results !== undefined)) {
    return undefined;
  }
  return stepsFromRound(
    toolCalls.map((call) => ({
      type: 'tool_call',
      tool_id: call.tool_id ?? 'unknown_tool',
      params: call.params,
      results: call.results as RoundResult[] | undefined,
    }))
  );
};
