/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { internalTools, ToolResultType, type ToolResult } from '@kbn/agent-builder-common';
import { PROPOSALS_CREATE_TOOL_ID } from '@kbn/proposals-common';
import { CORTEX_ENTITY_TYPE_BUCKETS, CORTEX_ENTITY_TYPES } from '../../common/cortex';
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

const SEEDED_DIR_NAMES = new Set<string>(['cortex', 'memories', 'decision-trees']);
const CORTEX_BUCKET_NAMES = new Set<string>(
  CORTEX_ENTITY_TYPES.map((entityType) => CORTEX_ENTITY_TYPE_BUCKETS[entityType])
);

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

const BASH_URL_RE = /\bhttps?:\/\/[^\s'")]+/gi;
const BASH_CD_RE = /^\s*cd\s+(?:'([^']+)'|"([^"]+)"|([^\s'";|&()<>]+))/;
const HEREDOC_OPEN_RE = /<<-?\s*['"]?([A-Za-z0-9_]+)['"]?/;
const INTERPRETER_VERBS = new Set<string>([
  'python',
  'python3',
  'node',
  'sh',
  'bash',
  'zsh',
  'perl',
  'ruby',
]);
const DIR_OR_SEARCH_VERBS = new Set<string>([
  'ls',
  'find',
  'tree',
  'du',
  'rg',
  'grep',
  'egrep',
  'fgrep',
]);
const SHELL_PREFIX_WORDS = new Set<string>([
  'do',
  'then',
  'else',
  'elif',
  'while',
  'until',
  'if',
  'time',
  '!',
  'env',
  'command',
  'sudo',
]);

export const PATH_TOKEN_RE = /[a-zA-Z0-9_./-]+/g;
const BASH_QUOTED_STRING_RE = /'[^']*'|"(?:[^"\\]|\\.)*"/g;
const BASH_UNQUOTED_STDOUT_REDIRECT_RE = /(?:^|[^\d&>])(?:1|&)?>>?\|?\s*(?!&)(?!\/dev\/stdout\b)/;

export const extractSegmentVerb = (segment: string): string | undefined => {
  for (const raw of segment.trim().split(/\s+/)) {
    const token = raw.replace(/^\(+/, '');
    if (!token || SHELL_PREFIX_WORDS.has(token)) {
      continue;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) {
      continue;
    }
    const match = /^[A-Za-z0-9_./-]+/.exec(token);
    return match ? Path.posix.basename(match[0]).toLowerCase() : undefined;
  }
  return undefined;
};

/**
 * Strips non-executable heredoc bodies (such as `cat <<'EOF' > file.md`) while keeping heredoc
 * bodies fed into an interpreter (`python - <<'PY'`, `bash <<'SH'`, etc.) when stdout is not
 * redirected to a file.
 */
const stripNonExecutableHeredocs = (command: string): string => {
  const lines = command.split('\n');
  const kept: string[] = [];
  let activeDelimiter: string | undefined;
  let keepBody = false;

  for (const line of lines) {
    if (activeDelimiter !== undefined) {
      if (line.trim() === activeDelimiter) {
        activeDelimiter = undefined;
      } else if (keepBody) {
        kept.push(line);
      }
      continue;
    }

    const match = HEREDOC_OPEN_RE.exec(line);
    if (match) {
      activeDelimiter = match[1];
      const headerBeforeHeredoc = line.slice(0, match.index);
      const verb = extractSegmentVerb(headerBeforeHeredoc);
      const unquotedLine = line.replace(BASH_QUOTED_STRING_RE, '');
      const hasStdoutFileRedirect = BASH_UNQUOTED_STDOUT_REDIRECT_RE.test(unquotedLine);
      keepBody = Boolean(verb && INTERPRETER_VERBS.has(verb) && !hasStdoutFileRedirect);
      kept.push(headerBeforeHeredoc + line.slice(match.index + match[0].length));
      continue;
    }

    kept.push(line);
  }

  return kept.join('\n');
};

export interface BashSegmentWithCwd {
  segment: string;
  cwd: string;
  /** Index within a `|` pipeline (`0` for the first command, `> 0` when reading piped stdin). */
  pipelineIndex: number;
}

/**
 * Splits a bash command into segments while stripping non-executable heredoc bodies and URLs
 * and tracking `cd <dir>` updates against `workingDirectory` (default `/workspace`).
 */
export const splitBashSegmentsWithCwd = (
  command: string,
  workingDirectory?: string
): BashSegmentWithCwd[] => {
  let cwd =
    typeof workingDirectory === 'string' && workingDirectory.trim().length > 0
      ? Path.posix.resolve('/workspace', workingDirectory.trim())
      : '/workspace';

  const sanitized = stripNonExecutableHeredocs(command).replace(BASH_URL_RE, '');
  const out: BashSegmentWithCwd[] = [];

  for (const statement of sanitized.split(/\n|;|&&|\|\|/)) {
    const stages = statement.split('|');
    for (let pipelineIndex = 0; pipelineIndex < stages.length; pipelineIndex++) {
      const segment = stages[pipelineIndex];
      const cdMatch = BASH_CD_RE.exec(segment);
      if (cdMatch) {
        const target = cdMatch[1] ?? cdMatch[2] ?? cdMatch[3];
        if (target && stages.length === 1) {
          cwd = Path.posix.resolve(cwd, target);
        }
        continue;
      }
      out.push({ segment, cwd, pipelineIndex });
    }
  }

  return out;
};

const isCandidateSeededToken = (rawToken: string, cwd: string): boolean => {
  const lower = rawToken.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.index.json')) {
    return true;
  }
  const parts = rawToken.split('/').filter((part) => part.length > 0 && part !== '.');
  if (parts.some((part) => SEEDED_DIR_NAMES.has(part))) {
    return true;
  }
  if (cwd === CORTEX_WORKSPACE_ROOT && parts.length > 0 && CORTEX_BUCKET_NAMES.has(parts[0])) {
    return true;
  }
  return false;
};

const bashAccessesSeededWorkspace = (
  command: string,
  workingDirectory: string | undefined,
  kindSet: ReadonlySet<SeededWorkspaceKind>
): boolean => {
  // Remove backslash-escaped quotes (e.g. `WHERE service.name == \"cortex\"`) so query literals are not mistaken for paths
  const cleanedCommand = command.replace(/\\["'][a-zA-Z0-9_.-]+\\["']/g, '');

  for (const { segment, cwd, pipelineIndex } of splitBashSegmentsWithCwd(
    cleanedCommand,
    workingDirectory
  )) {
    const tokens = segment.match(PATH_TOKEN_RE) ?? [];
    for (const token of tokens) {
      if (token.startsWith('-')) {
        continue;
      }
      if (isCandidateSeededToken(token, cwd) && matchesFilePathForKinds(token, kindSet, cwd)) {
        return true;
      }
    }

    if (pipelineIndex === 0 && matchesFilePathForKinds(cwd, kindSet)) {
      const verb = extractSegmentVerb(segment);
      if (verb && DIR_OR_SEARCH_VERBS.has(verb)) {
        return true;
      }
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
