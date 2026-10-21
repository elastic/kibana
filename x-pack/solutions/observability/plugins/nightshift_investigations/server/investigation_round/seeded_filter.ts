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

export const FILE_TOOL_IDS = new Set<string>([
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
  kinds: ReadonlySet<SeededWorkspaceKind>,
  baseDir = '/workspace'
): boolean => {
  const resolved = Path.posix.resolve(baseDir, rawPath);
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

const BASH_HEREDOC_BODY_RE = /<<-?\s*['"]?([A-Za-z0-9_]+)['"]?[^\n]*\n[\s\S]*?(?:\n\1(?=\n|$)|$)/g;
const BASH_URL_RE = /\bhttps?:\/\/[^\s'")]+/gi;
const BASH_CD_RE = /^\s*cd\s+(?:'([^']+)'|"([^"]+)"|([^\s'";|&()<>]+))/;
const BASH_BARE_DIR_LIST_RE = /^\s*(?:ls|find|tree|du)(?:\s+-[a-zA-Z0-9-]+)*\s*$/;
const BASH_DOT_PATH_RE =
  /^\s*(?:ls|find|tree|du|grep|rg)\b[^;|&\n]*(?:^|[\s'"=(])\.\.?(?:\/)?(?=[\s'";|)&>]|$)/;

// Matches explicit seeded directory paths or relative/absolute `.md` / `.index.json` file tokens in bash.
const BASH_CANDIDATE_PATH_RE =
  /(?:^|[\s'"=(:<])((?:\/workspace\/|\.\.?\/)(?:cortex|memories|decision-trees)(?:\/[a-z0-9_.-]*)*|(?:cortex|memories|decision-trees)\/[a-z0-9_./-]*|(?:\/workspace\/|\.\.?\/|[a-z0-9_.-]+\/)*(?:[a-z0-9][a-z0-9_-]*\.md|\.index\.json))(?=[^a-z0-9._/-]|$)/gi;

const BASH_BARE_SEEDED_DIR_RE = /(?:^|\s)(cortex|memories|decision-trees)(?=[\s;|)&>]|$)/g;

/**
 * Splits a bash command into pipeline/list segments while stripping heredoc bodies and URLs
 * and tracking `cd <dir>` updates against `workingDirectory` (default `/workspace`).
 */
export const splitBashSegmentsWithCwd = (
  command: string,
  workingDirectory?: string
): Array<{ segment: string; cwd: string }> => {
  let cwd =
    typeof workingDirectory === 'string' && workingDirectory.trim().length > 0
      ? Path.posix.resolve('/workspace', workingDirectory.trim())
      : '/workspace';

  const sanitized = command.replace(BASH_HEREDOC_BODY_RE, '<<$1').replace(BASH_URL_RE, '');
  const out: Array<{ segment: string; cwd: string }> = [];

  for (const segment of sanitized.split(/\n|;|&&|\|\||\|/)) {
    const cdMatch = BASH_CD_RE.exec(segment);
    if (cdMatch) {
      const target = cdMatch[1] ?? cdMatch[2] ?? cdMatch[3];
      if (target) {
        cwd = Path.posix.resolve(cwd, target);
      }
      continue;
    }
    out.push({ segment, cwd });
  }

  return out;
};

const bashAccessesSeededWorkspace = (
  command: string,
  workingDirectory: string | undefined,
  kindSet: ReadonlySet<SeededWorkspaceKind>
): boolean => {
  for (const { segment, cwd } of splitBashSegmentsWithCwd(command, workingDirectory)) {
    BASH_CANDIDATE_PATH_RE.lastIndex = 0;
    let match = BASH_CANDIDATE_PATH_RE.exec(segment);
    while (match) {
      if (matchesFilePathForKinds(match[1], kindSet, cwd)) {
        return true;
      }
      match = BASH_CANDIDATE_PATH_RE.exec(segment);
    }

    BASH_BARE_SEEDED_DIR_RE.lastIndex = 0;
    let dirMatch = BASH_BARE_SEEDED_DIR_RE.exec(segment);
    while (dirMatch) {
      if (matchesFilePathForKinds(dirMatch[1], kindSet, cwd)) {
        return true;
      }
      dirMatch = BASH_BARE_SEEDED_DIR_RE.exec(segment);
    }

    if (
      matchesFilePathForKinds(cwd, kindSet) &&
      (BASH_BARE_DIR_LIST_RE.test(segment) || BASH_DOT_PATH_RE.test(segment))
    ) {
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
    const workingDirectory =
      typeof params.working_directory === 'string' ? params.working_directory : undefined;
    return bashAccessesSeededWorkspace(params.command, workingDirectory, kindSet);
  }

  return false;
};

/** True when a tool call is an evidence-gathering call rather than a seeded-knowledge read or process tool. */
export const isEvidenceToolCall = (
  toolId: string | undefined,
  params: Record<string, unknown> | undefined,
  options?: Pick<SeededFilterOptions, 'skipRoots'>
): boolean =>
  Boolean(toolId) &&
  !NON_EVIDENCE_TOOL_IDS.has(toolId!) &&
  !isSeededWorkspaceAccess(toolId, params, { skipRoots: options?.skipRoots });

export const OMITTED_SEEDED_RESULT_REASON = 'Nightshift-seeded workspace file; not evidence';

const omittedToolResult = (toolCallId: string | undefined, reason: string): ToolResult => ({
  tool_result_id: `${toolCallId ?? 'call'}-omitted`,
  type: ToolResultType.other,
  data: { omitted: reason },
});

const shouldFilterCall = (
  toolId: string,
  params: Record<string, unknown>,
  skipRoots: readonly SeededWorkspaceKind[],
  skipNonEvidenceTools: boolean
): boolean =>
  (skipNonEvidenceTools && NON_EVIDENCE_TOOL_IDS.has(toolId)) ||
  isSeededWorkspaceAccess(toolId, params, { skipRoots });

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
    if (
      step.kind !== 'tool' ||
      !shouldFilterCall(step.toolId, step.params, skipRoots, skipNonEvidenceTools)
    ) {
      out.push(step);
      continue;
    }
    if (mode === 'omit_result') {
      out.push({
        ...step,
        results: [omittedToolResult(step.toolCallId, OMITTED_SEEDED_RESULT_REASON)],
        resultText: `omitted: ${OMITTED_SEEDED_RESULT_REASON}`,
      });
    }
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
    if (!shouldFilterCall(toolId, params, skipRoots, skipNonEvidenceTools)) {
      out.push(call);
      continue;
    }
    if (mode === 'omit_result') {
      out.push({
        ...call,
        results: call.results
          ? [omittedToolResult(call.tool_call_id, OMITTED_SEEDED_RESULT_REASON)]
          : undefined,
      });
    }
  }
  return out;
};
