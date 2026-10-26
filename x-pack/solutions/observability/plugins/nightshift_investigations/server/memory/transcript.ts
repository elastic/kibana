/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import {
  isEvidenceToolCall,
  isSeededWorkspaceAccess,
  stepsFromRound as roundLoaderStepsFromRound,
  stepsFromToolCalls as roundLoaderStepsFromToolCalls,
  type RawRoundStep,
  type SeededWorkspaceKind,
} from '../investigation_round';

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
 * knowledge Nightshift seeded into the sandbox (Cortex, decision trees, environment docs), and
 * calls that only record the agent's own process or findings (recorded findings, todos, skills,
 * file edits).
 * Any other tool is kept, so a new query tool is not silently hidden.
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

// Memory transcripts keep `/workspace/memories/*` reads so critique can see which recalled
// memories were opened and followed, while dropping Cortex, decision trees, and environment docs.
const MEMORY_SKIP_SEEDED_ROOTS: readonly SeededWorkspaceKind[] = [
  'cortex',
  'decision_trees',
  'env_docs',
];

export const readsSeededKnowledge = (toolId: string, params: Record<string, unknown>): boolean =>
  isSeededWorkspaceAccess(toolId, params, { skipRoots: MEMORY_SKIP_SEEDED_ROOTS });

export const isEvidenceCall = (toolId: string, params: Record<string, unknown>): boolean =>
  isEvidenceToolCall(toolId, params, { skipRoots: MEMORY_SKIP_SEEDED_ROOTS });

/** Whether at least one evidence call in the investigation returned output. */
export const hasToolEvidence = (investigation: readonly TranscriptStep[] | undefined): boolean =>
  (investigation ?? []).some(
    (step) =>
      step.kind === 'tool' &&
      (step.resultText?.trim().length ?? 0) > 0 &&
      isEvidenceCall(step.toolId, step.params)
  );

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
  /** Drop seeded Cortex and decision-tree reads and recorded findings, with their results. */
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

const toTranscriptSteps = (steps: ReturnType<typeof roundLoaderStepsFromRound>): TranscriptStep[] =>
  steps.map((step) =>
    step.kind === 'reasoning'
      ? { kind: 'reasoning', text: step.text }
      : {
          kind: 'tool',
          toolId: step.toolId,
          params: step.params,
          resultText: step.resultText,
          isError: step.isError,
        }
  );

/** Normalizes an Agent Builder round's steps (reasoning and tool calls) into transcript steps. */
export const stepsFromRound = (steps: readonly RawRoundStep[]): TranscriptStep[] =>
  toTranscriptSteps(roundLoaderStepsFromRound(steps));

/**
 * Builds the investigation from the hook's tool calls when they carry results. It has no agent
 * notes, but each call shows what it returned.
 */
export const stepsFromToolCalls = (
  toolCalls: readonly InvestigationToolCall[]
): TranscriptStep[] | undefined => {
  const steps = roundLoaderStepsFromToolCalls(toolCalls);
  return steps ? toTranscriptSteps(steps) : undefined;
};
