/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { renderToolCalls } from '../cortex/optimize';

/**
 * The text the Semantic Memory critique and extraction calls read.
 *
 * Layout, in the order the model should weigh it:
 *  1. the user's task;
 *  2. the investigation, in order: the agent's short notes and every tool call with an excerpt of
 *     its result. Files the agent loaded from its own prior context (memories, Cortex, decision
 *     trees) are collapsed to one line: they are already known, so they are not new evidence and
 *     re-reading them must not re-teach memory;
 *  3. the final answer last, next to the instructions. It is a synthesis and can contain the
 *     agent's inferences, so facts should be backed by a result above.
 *
 * When the persisted round cannot be read, the investigation falls back to tool-call parameters.
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

/** Only the sandbox tools show the environment. The agent's own status reports duplicate its answer. */
const PROGRESS_REPORT_TOOL_ID = 'platform.streams.investigation_progress_report';

const HYDRATED_CONTEXT_PATH =
  /^\/workspace\/(?:memories\/|cortex\/|decision-trees\/|elastic\.md$|connectors\.md$)/;
const SHELL_OPERATORS = /[|;&<>`$()]/;
// `cat /workspace/cortex/x.md`, `head -50 /workspace/memories/y.md`, `ls /workspace/decision-trees`.
const HYDRATED_CONTEXT_COMMAND =
  /^\s*(?:cat|head|tail|ls|sed)\b[^|;&]*?(\/workspace\/(?:memories|cortex|decision-trees)\b[^\s|;&]*|\/workspace\/(?:elastic|connectors)\.md)/;

const clip = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max)}… (+${text.length - max} chars)`;

const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** The hydrated-context path a call reads, if it only reads one. */
export const hydratedContextPath = (
  toolId: string,
  params: Record<string, unknown>
): string | undefined => {
  if (toolId.endsWith('view_file')) {
    const path = params.file_path;
    return typeof path === 'string' && HYDRATED_CONTEXT_PATH.test(path) ? path : undefined;
  }
  if (toolId.endsWith('bash')) {
    const command = params.command;
    // Any pipe, redirect, chaining, or substitution means the command did more than read, so
    // its result is evidence.
    if (typeof command !== 'string' || SHELL_OPERATORS.test(command)) return undefined;
    return HYDRATED_CONTEXT_COMMAND.exec(command)?.[1];
  }
  return undefined;
};

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

const renderInvestigation = (steps: TranscriptStep[], excerptChars: number): Rendered => {
  const contextPaths: string[] = [];
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
    if (step.toolId === PROGRESS_REPORT_TOOL_ID) continue;
    const contextPath = hydratedContextPath(step.toolId, step.params);
    if (contextPath !== undefined && !step.isError) {
      if (!contextPaths.includes(contextPath)) contextPaths.push(contextPath);
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
    } else if (step.resultText === undefined) {
      lines.push('   Result: (not available)');
    }
    entries.push(lines.join('\n'));
  }

  const header =
    contextPaths.length > 0
      ? [
          `Loaded from prior context (already known, not new evidence): ${contextPaths.join(', ')}`,
          '',
        ]
      : [];
  let kept = entries.length;
  let text = [...header, ...entries].join('\n');
  while (text.length > MAX_INVESTIGATION_CHARS && kept > 0) {
    kept -= 1;
    text = [...header, ...entries.slice(0, kept)].join('\n');
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
}: {
  task: string;
  answer: string;
  /** The round's steps, in order, when the persisted round could be read. */
  investigation?: TranscriptStep[];
  /** Parameters-only fallback, used when `investigation` is unavailable. */
  toolCalls: InvestigationToolCall[];
}): string => {
  const middle =
    investigation !== undefined
      ? ['## Investigation', fitInvestigation(investigation)]
      : ['## Tool calls (parameters only; results unavailable)', renderToolCalls(toolCalls)];
  return [
    '## User task',
    task.slice(0, MAX_TASK_CHARS),
    '',
    ...middle,
    '',
    '## Final answer',
    answer.slice(0, MAX_ANSWER_CHARS),
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
