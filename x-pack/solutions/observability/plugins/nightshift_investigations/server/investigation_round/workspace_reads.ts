/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { symptomTreeId } from '@kbn/nightshift-decision-trees';
import {
  CORTEX_ENTITY_TYPE_BUCKETS,
  CORTEX_ENTITY_TYPES,
  type CortexEntityType,
} from '../../common/cortex';
import { CORTEX_WORKSPACE_ROOT } from '../cortex/materialize';
import { toCortexKiId } from '../cortex/page_store';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import {
  DECISION_TREE_WORKSPACE_ROOT,
  MONITORS_INDEX_FILENAME,
} from '../decision_trees/materialize';
import { MEMORY_WORKSPACE_ROOT } from '../memory/materialize';
import { isCanonicalMemoryId, slugFromMemoryId, toMemoryKiId } from '../memory/page_store';
import { SANDBOX_BASH_TOOL_ID } from '../tools/sandbox_bash/tool';
import { SANDBOX_WRITE_FILE_TOOL_ID } from '../tools/sandbox_bash/write_file_tool';
import {
  stepsFromRound,
  type InvestigationTranscriptStep,
  type RawRoundResult,
} from './round_loader';
import { FILE_TOOL_IDS, splitBashSegmentsWithCwd } from './seeded_filter';

export interface WorkspaceReadsSummary {
  /** Canonical Cortex page IDs (`cortex_<entityType>_<slug>`) opened by the agent (excludes `README.md` / `INDEX.md`). */
  cortexIds: string[];
  /** Canonical Semantic Memory IDs (`memory_<slug>`) opened by the agent (excludes `README.md` / `.index.json`). */
  memoryIds: string[];
  /** Canonical Decision Tree IDs (`symptom:<slug>`) opened or edited by the agent (excludes `monitors.md`). */
  decisionTreeIds: string[];
  /** Whether the agent opened the catalog/index file of each store. */
  indexReads: {
    cortexIndex: boolean;
    memoryIndex: boolean;
    decisionTreeIndex: boolean;
  };
}

const BUCKET_TO_ENTITY_TYPE = new Map<string, CortexEntityType>(
  CORTEX_ENTITY_TYPES.map((entityType) => [CORTEX_ENTITY_TYPE_BUCKETS[entityType], entityType])
);

const BASH_DECISION_TREE_FILE_RE =
  /(?:^|\/)decision_tree_([a-z0-9]+(?:-[a-z0-9]+)*)\.md(?:$|[^a-z0-9-])/g;

const BASH_QUOTED_STRING_RE = /'[^']*'|"(?:[^"\\]|\\.)*"/g;
const BASH_UNQUOTED_STDOUT_REDIRECT_RE = /(?:^|[^\d&>])(?:1|&)?>>?\|?\s*(?!&)(?!\/dev\/stdout\b)/;
const BASH_WRITE_CALL_RE =
  /\b(?:sed|perl)\b[^;|&\n]*\s-[a-zA-Z]*i|\b(?:write_text|writeFileSync)\s*\(|\bopen\s*\([^)]*,\s*['"][wa+]/;
const BASH_LEADING_KEYWORDS_RE =
  /^(?:\s*(?:do|then|else|elif|while|until|if|time|!|\(|env|command|sudo)\b)+/;
const BASH_LEADING_ENV_ASSIGN_RE = /^(?:\s*[A-Za-z_][A-Za-z0-9_]*=(?:'[^']*'|"[^"]*"|\S+))+/;

// Commands whose arguments are never read and printed as file contents to stdout.
const NON_FILE_READING_VERBS = new Set<string>([
  'echo',
  'printf',
  'tee',
  'rm',
  'mv',
  'cp',
  'touch',
  'mkdir',
  'rmdir',
  'ln',
  'chmod',
  'chown',
  'chgrp',
  'truncate',
  'dd',
  'install',
  'mktemp',
  'cd',
  'export',
  'unset',
  'true',
  'false',
  'sleep',
  'kill',
  'pkill',
  'curl',
  'wget',
]);

// Matches relative or absolute `.md` or `.index.json` file tokens in a bash read command.
const BASH_FILE_TOKEN_RE =
  /(?:^|[\s'"=(:<])((?:\/workspace\/|\.\.?\/|[a-z0-9_.-]+\/)*(?:[a-z0-9][a-z0-9_-]*\.md|\.index\.json))(?=[^a-z0-9._/-]|$)/gi;

interface MutableReads {
  cortexIds: Set<string>;
  memoryIds: Set<string>;
  decisionTreeIds: Set<string>;
  cortexIndex: boolean;
  memoryIndex: boolean;
  decisionTreeIndex: boolean;
}

const recordResolvedFilePath = (
  rawPath: string,
  acc: MutableReads,
  options?: { allowCortexAndMemory?: boolean; baseDir?: string }
): void => {
  const allowCortexAndMemory = options?.allowCortexAndMemory ?? true;
  const resolved = Path.posix.resolve(options?.baseDir ?? '/workspace', rawPath);

  if (resolved.startsWith(`${CORTEX_WORKSPACE_ROOT}/`)) {
    if (!allowCortexAndMemory) {
      return;
    }
    const relative = resolved.slice(`${CORTEX_WORKSPACE_ROOT}/`.length);
    if (relative === 'INDEX.md') {
      acc.cortexIndex = true;
      return;
    }
    if (relative === 'README.md') {
      return;
    }
    const parts = relative.split('/');
    if (parts.length === 2 && parts[1].endsWith('.md')) {
      const entityType = BUCKET_TO_ENTITY_TYPE.get(parts[0]);
      const rawSlug = parts[1].slice(0, -'.md'.length);
      if (entityType && rawSlug.length > 0) {
        acc.cortexIds.add(toCortexKiId(entityType, rawSlug));
      }
    }
    return;
  }

  if (resolved.startsWith(`${MEMORY_WORKSPACE_ROOT}/`)) {
    if (!allowCortexAndMemory) {
      return;
    }
    const relative = resolved.slice(`${MEMORY_WORKSPACE_ROOT}/`.length);
    if (relative === '.index.json') {
      acc.memoryIndex = true;
      return;
    }
    if (relative === 'README.md' || relative.includes('/')) {
      return;
    }
    if (relative.endsWith('.md')) {
      const rawSlug = relative.slice(0, -'.md'.length);
      const id = toMemoryKiId(rawSlug);
      if (isCanonicalMemoryId(id) && slugFromMemoryId(id) === rawSlug) {
        acc.memoryIds.add(id);
      }
    }
    return;
  }

  if (resolved.startsWith(`${DECISION_TREE_WORKSPACE_ROOT}/`)) {
    const relative = resolved.slice(`${DECISION_TREE_WORKSPACE_ROOT}/`.length);
    if (relative === MONITORS_INDEX_FILENAME) {
      acc.decisionTreeIndex = true;
      return;
    }
  }

  BASH_DECISION_TREE_FILE_RE.lastIndex = 0;
  let match = BASH_DECISION_TREE_FILE_RE.exec(rawPath);
  while (match) {
    acc.decisionTreeIds.add(symptomTreeId(match[1]));
    match = BASH_DECISION_TREE_FILE_RE.exec(rawPath);
  }
};

const extractSegmentVerb = (segment: string): string | undefined => {
  const stripped = segment
    .replace(BASH_LEADING_KEYWORDS_RE, '')
    .replace(BASH_LEADING_ENV_ASSIGN_RE, '')
    .trim();
  const match = /^([A-Za-z0-9_./-]+)/.exec(stripped);
  return match ? Path.posix.basename(match[1]).toLowerCase() : undefined;
};

const recordBashCommandReads = (
  command: string,
  acc: MutableReads,
  workingDirectory?: string
): void => {
  // Decision tree attribution includes both reads and edits anywhere in the command.
  BASH_DECISION_TREE_FILE_RE.lastIndex = 0;
  let treeMatch = BASH_DECISION_TREE_FILE_RE.exec(command);
  while (treeMatch) {
    acc.decisionTreeIds.add(symptomTreeId(treeMatch[1]));
    treeMatch = BASH_DECISION_TREE_FILE_RE.exec(command);
  }

  for (const { segment, cwd } of splitBashSegmentsWithCwd(command, workingDirectory)) {
    const unquoted = segment.replace(BASH_QUOTED_STRING_RE, '');
    if (BASH_UNQUOTED_STDOUT_REDIRECT_RE.test(unquoted) || BASH_WRITE_CALL_RE.test(segment)) {
      continue;
    }
    const verb = extractSegmentVerb(segment);
    if (!verb || NON_FILE_READING_VERBS.has(verb)) {
      continue;
    }

    BASH_FILE_TOKEN_RE.lastIndex = 0;
    let fileMatch = BASH_FILE_TOKEN_RE.exec(segment);
    while (fileMatch) {
      recordResolvedFilePath(fileMatch[1], acc, { baseDir: cwd });
      fileMatch = BASH_FILE_TOKEN_RE.exec(segment);
    }
  }
};

/**
 * Extracts canonical IDs of Cortex pages, Semantic Memories, and Decision Trees whose contents
 * the investigator actually saw (`opened_ids` impressions).
 *
 * Failed tool calls (`step.isError === true` or non-zero bash exit code) and write-only operations
 * are excluded so a failed read or blind overwrite never counts as an impression.
 */
export const extractWorkspaceReads = (
  steps: readonly InvestigationTranscriptStep[]
): WorkspaceReadsSummary => {
  const acc: MutableReads = {
    cortexIds: new Set<string>(),
    memoryIds: new Set<string>(),
    decisionTreeIds: new Set<string>(),
    cortexIndex: false,
    memoryIndex: false,
    decisionTreeIndex: false,
  };

  for (const step of steps) {
    if (step.kind !== 'tool' || step.isError) {
      continue;
    }

    const { toolId, params } = step;
    const filePath = params.file_path ?? params.path;
    if (FILE_TOOL_IDS.has(toolId) && typeof filePath === 'string') {
      recordResolvedFilePath(filePath, acc, {
        allowCortexAndMemory: toolId !== SANDBOX_WRITE_FILE_TOOL_ID,
      });
      continue;
    }

    if (
      (toolId === SANDBOX_BASH_TOOL_ID || toolId.endsWith('bash')) &&
      typeof params.command === 'string'
    ) {
      const workingDirectory =
        typeof params.working_directory === 'string' ? params.working_directory : undefined;
      recordBashCommandReads(params.command, acc, workingDirectory);
    }
  }

  return {
    cortexIds: [...acc.cortexIds],
    memoryIds: [...acc.memoryIds],
    decisionTreeIds: [...acc.decisionTreeIds],
    indexReads: {
      cortexIndex: acc.cortexIndex,
      memoryIndex: acc.memoryIndex,
      decisionTreeIndex: acc.decisionTreeIndex,
    },
  };
};

/**
 * Convenience wrapper that normalizes `InvestigationToolCall[]` (including any attached results
 * so error calls are excluded) and extracts workspace reads.
 */
export const extractWorkspaceReadsFromToolCalls = (
  toolCalls: readonly InvestigationToolCall[]
): WorkspaceReadsSummary =>
  extractWorkspaceReads(
    stepsFromRound(
      toolCalls.map((call) => ({
        type: 'tool_call',
        tool_id: call.tool_id ?? 'unknown_tool',
        tool_call_id: call.tool_call_id,
        params: call.params ?? {},
        results: call.results as RawRoundResult[] | undefined,
      }))
    )
  );
