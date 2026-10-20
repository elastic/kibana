/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { internalTools, ToolResultType, type ToolResult } from '@kbn/agent-builder-common';
import { PROPOSALS_CREATE_TOOL_ID } from '@kbn/proposals-common';
import { INVESTIGATION_TOOL_IDS } from '../agents/investigation';
import { CORTEX_WORKSPACE_ROOT } from '../cortex/materialize';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { DECISION_TREE_WORKSPACE_ROOT } from '../decision_trees/materialize';
import { MEMORY_WORKSPACE_ROOT } from '../memory/materialize';
import { SANDBOX_BASH_TOOL_ID } from '../tools/sandbox_bash/tool';
import { SANDBOX_STR_REPLACE_TOOL_ID } from '../tools/sandbox_bash/str_replace_tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../tools/sandbox_bash/view_file_tool';
import { SANDBOX_WRITE_FILE_TOOL_ID } from '../tools/sandbox_bash/write_file_tool';
import type { InvestigationTranscriptStep } from './round_loader';

export const SEEDED_WORKSPACE_KINDS = ['cortex', 'memories', 'decision_trees', 'env_docs'] as const;

export type SeededWorkspaceKind = (typeof SEEDED_WORKSPACE_KINDS)[number];

export const SEEDED_ENV_FILES = ['/workspace/elastic.md', '/workspace/connectors.md'] as const;

const SEEDED_ROOT_BY_KIND: Record<Exclude<SeededWorkspaceKind, 'env_docs'>, string> = {
  cortex: CORTEX_WORKSPACE_ROOT,
  memories: MEMORY_WORKSPACE_ROOT,
  decision_trees: DECISION_TREE_WORKSPACE_ROOT,
};

const FILE_TOOL_IDS = new Set<string>([
  SANDBOX_VIEW_FILE_TOOL_ID,
  SANDBOX_STR_REPLACE_TOOL_ID,
  SANDBOX_WRITE_FILE_TOOL_ID,
]);

export const NON_EVIDENCE_TOOL_IDS = new Set<string>([
  // The agent records its findings with these; they are conclusions, not evidence.
  ...INVESTIGATION_TOOL_IDS,
  'platform.streams.investigation_progress_report',
  PROPOSALS_CREATE_TOOL_ID,
  internalTools.writeTodos,
  internalTools.listFiles,
  internalTools.loadSkill,
  internalTools.searchRelevantSkills,
  internalTools.sleep,
  internalTools.setConversationMetadata,
  internalTools.askUserQuestion,
  SANDBOX_WRITE_FILE_TOOL_ID,
  SANDBOX_STR_REPLACE_TOOL_ID,
]);

const buildBashRegexForKinds = (kinds: readonly SeededWorkspaceKind[]): RegExp | undefined => {
  const tokens: string[] = [];
  for (const kind of kinds) {
    if (kind === 'env_docs') {
      for (const file of SEEDED_ENV_FILES) {
        tokens.push(Path.posix.basename(file).replace('.', '\\.'));
      }
    } else {
      const root = SEEDED_ROOT_BY_KIND[kind];
      tokens.push(Path.posix.basename(root).replace('.', '\\.'));
    }
  }
  if (tokens.length === 0) {
    return undefined;
  }
  return new RegExp(
    `(?:^|[\\s'"=(:<])(?:/workspace/|\\./)?(?:${tokens.join('|')})(?:/|[\\s'";|)&>]|$)`
  );
};

export interface SeededFilterOptions {
  /**
   * Which seeded workspace roots/files to treat as non-evidence reads.
   * Defaults to all 4 (`['cortex', 'memories', 'decision_trees', 'env_docs']`) so no optimizer
   * echoes its own seeded files or cross-contaminates another store.
   */
  skipRoots?: readonly SeededWorkspaceKind[];
  /**
   * When true, also filters out non-evidence process/recording tools (`write_todos`,
   * `record_hypothesis`, `str_replace`, `write_file`, etc.).
   */
  skipNonEvidenceTools?: boolean;
  /**
   * `'drop_step'` removes matching tool steps entirely; `'omit_result'` keeps the tool call
   * in the sequence while replacing its result with a short omitted marker (used when rebuilding
   * provider tool-call history where every tool call must remain paired with a result).
   */
  mode?: 'drop_step' | 'omit_result';
}

const matchesFilePathForKinds = (
  rawPath: string,
  kinds: ReadonlySet<SeededWorkspaceKind>
): boolean => {
  const resolved = Path.posix.resolve('/workspace', rawPath);
  if (kinds.has('env_docs') && (SEEDED_ENV_FILES as readonly string[]).includes(resolved)) {
    return true;
  }
  for (const kind of ['cortex', 'memories', 'decision_trees'] as const) {
    if (!kinds.has(kind)) {
      continue;
    }
    const root = SEEDED_ROOT_BY_KIND[kind];
    if (resolved === root || resolved.startsWith(`${root}/`)) {
      return true;
    }
  }
  return false;
};

/**
 * True when a tool call accesses one of the specified Nightshift-seeded workspace roots or files
 * (`cortex`, `memories`, `decision_trees`, `env_docs`) via a file tool or `bash` command.
 */
export const isSeededWorkspaceAccess = (
  toolId: string | undefined,
  params: Record<string, unknown> | undefined,
  options?: Pick<SeededFilterOptions, 'skipRoots'>
): boolean => {
  if (!toolId || !params) {
    return false;
  }
  const skipRoots = options?.skipRoots ?? SEEDED_WORKSPACE_KINDS;
  if (skipRoots.length === 0) {
    return false;
  }
  const kindSet = new Set<SeededWorkspaceKind>(skipRoots);

  const filePath = params.file_path ?? params.path;
  if ((FILE_TOOL_IDS.has(toolId) || typeof filePath === 'string') && typeof filePath === 'string') {
    return matchesFilePathForKinds(filePath, kindSet);
  }

  if (
    (toolId === SANDBOX_BASH_TOOL_ID || toolId.endsWith('bash')) &&
    typeof params.command === 'string'
  ) {
    if (
      typeof params.working_directory === 'string' &&
      params.working_directory.trim().length > 0 &&
      matchesFilePathForKinds(params.working_directory.trim(), kindSet)
    ) {
      return true;
    }
    const bashRe = buildBashRegexForKinds(skipRoots);
    return bashRe ? bashRe.test(params.command) : false;
  }

  return false;
};

/** True when a tool call is an evidence-gathering call rather than a seeded-knowledge read or process tool. */
export const isEvidenceToolCall = (
  toolId: string | undefined,
  params: Record<string, unknown> | undefined,
  options?: Pick<SeededFilterOptions, 'skipRoots'>
): boolean => {
  if (!toolId) {
    return false;
  }
  return (
    !NON_EVIDENCE_TOOL_IDS.has(toolId) &&
    !isSeededWorkspaceAccess(toolId, params, { skipRoots: options?.skipRoots })
  );
};

export const OMITTED_SEEDED_RESULT_REASON = 'Nightshift-seeded workspace file; not evidence';

const omittedToolResult = (toolCallId: string | undefined, reason: string): ToolResult => ({
  tool_result_id: `${toolCallId ?? 'call'}-omitted`,
  type: ToolResultType.other,
  data: { omitted: reason },
});

/**
 * Filters normalized `InvestigationTranscriptStep[]` according to `SeededFilterOptions`.
 */
export const filterSeededWorkspaceSteps = (
  steps: readonly InvestigationTranscriptStep[],
  options?: SeededFilterOptions
): InvestigationTranscriptStep[] => {
  const skipRoots = options?.skipRoots ?? SEEDED_WORKSPACE_KINDS;
  const skipNonEvidenceTools = options?.skipNonEvidenceTools ?? false;
  const mode = options?.mode ?? 'drop_step';

  const out: InvestigationTranscriptStep[] = [];
  for (const step of steps) {
    if (step.kind !== 'tool') {
      out.push(step);
      continue;
    }

    const isNonEvidenceTool = skipNonEvidenceTools && NON_EVIDENCE_TOOL_IDS.has(step.toolId);
    const isSeeded = isSeededWorkspaceAccess(step.toolId, step.params, { skipRoots });
    if (!isNonEvidenceTool && !isSeeded) {
      out.push(step);
      continue;
    }

    if (mode === 'drop_step') {
      continue;
    }

    out.push({
      ...step,
      results: [omittedToolResult(step.toolCallId, OMITTED_SEEDED_RESULT_REASON)],
      resultText: `omitted: ${OMITTED_SEEDED_RESULT_REASON}`,
    });
  }

  return out;
};

/**
 * Filters raw `InvestigationToolCall[]` according to `SeededFilterOptions`.
 */
export const filterSeededWorkspaceToolCalls = (
  toolCalls: readonly InvestigationToolCall[],
  options?: SeededFilterOptions
): InvestigationToolCall[] => {
  const skipRoots = options?.skipRoots ?? SEEDED_WORKSPACE_KINDS;
  const skipNonEvidenceTools = options?.skipNonEvidenceTools ?? false;
  const mode = options?.mode ?? 'drop_step';

  const out: InvestigationToolCall[] = [];
  for (const call of toolCalls) {
    const toolId = call.tool_id ?? 'unknown_tool';
    const params = call.params ?? {};
    const isNonEvidenceTool = skipNonEvidenceTools && NON_EVIDENCE_TOOL_IDS.has(toolId);
    const isSeeded = isSeededWorkspaceAccess(toolId, params, { skipRoots });

    if (!isNonEvidenceTool && !isSeeded) {
      out.push(call);
      continue;
    }

    if (mode === 'drop_step') {
      continue;
    }

    out.push({
      ...call,
      results: call.results
        ? [omittedToolResult(call.tool_call_id, OMITTED_SEEDED_RESULT_REASON)]
        : undefined,
    });
  }

  return out;
};
