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
import { SANDBOX_STR_REPLACE_TOOL_ID } from '../tools/sandbox_bash/str_replace_tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../tools/sandbox_bash/view_file_tool';
import { SANDBOX_WRITE_FILE_TOOL_ID } from '../tools/sandbox_bash/write_file_tool';
import {
  extractResultSummary,
  stepsFromRound,
  type InvestigationTranscriptStep,
  type RawRoundResult,
} from './round_loader';

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

const FILE_TOOL_IDS = new Set<string>([
  SANDBOX_VIEW_FILE_TOOL_ID,
  SANDBOX_STR_REPLACE_TOOL_ID,
  SANDBOX_WRITE_FILE_TOOL_ID,
]);

const BUCKET_TO_ENTITY_TYPE = new Map<string, CortexEntityType>(
  CORTEX_ENTITY_TYPES.map((entityType) => [CORTEX_ENTITY_TYPE_BUCKETS[entityType], entityType])
);

const CORTEX_BUCKET_PATTERN = [...BUCKET_TO_ENTITY_TYPE.keys()].join('|');

// Matches Cortex file references in bash commands, e.g. `/workspace/cortex/services/checkout.md` or `cortex/alerts/high-cpu.md`
const BASH_CORTEX_FILE_RE = new RegExp(
  `(?:^|[\\s'"=(:<])(?:/workspace/|\\./)?cortex/(?:(${CORTEX_BUCKET_PATTERN})/([a-z0-9][a-z0-9-]*\\.md)|((?:INDEX|README)\\.md))(?=[^a-z0-9._-]|$)`,
  'gi'
);

// Matches Semantic Memory file references in bash commands, e.g. `/workspace/memories/redis-timeout.md` or `memories/.index.json`
const BASH_MEMORY_FILE_RE =
  /(?:^|[\s'"=(:<])(?:\/workspace\/|\.\/)?memories\/([a-z0-9][a-z0-9-]*\.md|\.index\.json|README\.md)(?=[^a-z0-9._-]|$)/gi;

// Matches Decision Tree file references in bash commands (either `decision_tree_<slug>.md` or `decision-trees/monitors.md`)
const BASH_DECISION_TREE_FILE_RE =
  /(?:^|\/)decision_tree_([a-z0-9]+(?:-[a-z0-9]+)*)\.md(?:$|[^a-z0-9-])/g;

const BASH_DECISION_TREE_INDEX_RE =
  /(?:^|[\s'"=(:<])(?:\/workspace\/|\.\/)?decision-trees\/monitors\.md(?=[^a-z0-9._-]|$)/i;

interface MutableReads {
  cortexIds: Set<string>;
  memoryIds: Set<string>;
  decisionTreeIds: Set<string>;
  cortexIndex: boolean;
  memoryIndex: boolean;
  decisionTreeIndex: boolean;
}

const recordResolvedFilePath = (rawPath: string, acc: MutableReads): void => {
  const resolved = Path.posix.resolve('/workspace', rawPath);

  if (resolved.startsWith(`${CORTEX_WORKSPACE_ROOT}/`)) {
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

  // Also match `decision_tree_<slug>.md` anywhere in a file path (matching existing `extractAccessedTreeIds` behavior)
  BASH_DECISION_TREE_FILE_RE.lastIndex = 0;
  let match = BASH_DECISION_TREE_FILE_RE.exec(rawPath);
  while (match) {
    acc.decisionTreeIds.add(symptomTreeId(match[1]));
    match = BASH_DECISION_TREE_FILE_RE.exec(rawPath);
  }
};

const recordBashCommandReads = (command: string, acc: MutableReads): void => {
  BASH_CORTEX_FILE_RE.lastIndex = 0;
  let cortexMatch = BASH_CORTEX_FILE_RE.exec(command);
  while (cortexMatch) {
    const [, bucket, fileWithMd, indexOrReadme] = cortexMatch;
    if (indexOrReadme && indexOrReadme.toUpperCase() === 'INDEX.MD') {
      acc.cortexIndex = true;
    } else if (bucket && fileWithMd) {
      recordResolvedFilePath(`${CORTEX_WORKSPACE_ROOT}/${bucket}/${fileWithMd}`, acc);
    }
    cortexMatch = BASH_CORTEX_FILE_RE.exec(command);
  }

  BASH_MEMORY_FILE_RE.lastIndex = 0;
  let memoryMatch = BASH_MEMORY_FILE_RE.exec(command);
  while (memoryMatch) {
    const [, fileName] = memoryMatch;
    if (fileName) {
      recordResolvedFilePath(`${MEMORY_WORKSPACE_ROOT}/${fileName}`, acc);
    }
    memoryMatch = BASH_MEMORY_FILE_RE.exec(command);
  }

  if (BASH_DECISION_TREE_INDEX_RE.test(command)) {
    acc.decisionTreeIndex = true;
  }

  BASH_DECISION_TREE_FILE_RE.lastIndex = 0;
  let treeMatch = BASH_DECISION_TREE_FILE_RE.exec(command);
  while (treeMatch) {
    acc.decisionTreeIds.add(symptomTreeId(treeMatch[1]));
    treeMatch = BASH_DECISION_TREE_FILE_RE.exec(command);
  }
};

/**
 * Extracts canonical IDs of Cortex pages, Semantic Memories, and Decision Trees whose contents
 * the investigator actually saw (`opened_ids` impressions).
 *
 * Failed tool calls (`step.isError === true` or non-zero bash exit code) are excluded so a failed
 * `view_file` or `cat` on a nonexistent path never counts as an impression.
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
      recordResolvedFilePath(filePath, acc);
      continue;
    }

    if (
      (toolId === SANDBOX_BASH_TOOL_ID || toolId.endsWith('bash')) &&
      typeof params.command === 'string'
    ) {
      recordBashCommandReads(params.command, acc);
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
): WorkspaceReadsSummary => {
  const steps = stepsFromRound(
    toolCalls.map((call) => {
      const results = call.results as RawRoundResult[] | undefined;
      return {
        type: 'tool_call',
        tool_id: call.tool_id ?? 'unknown_tool',
        tool_call_id: call.tool_call_id,
        params: call.params ?? {},
        results,
      };
    })
  );
  // Ensure `extractResultSummary` error detection is honored when results are present
  return extractWorkspaceReads(
    steps.map((step) => {
      if (step.kind !== 'tool' || !step.results) {
        return step;
      }
      const { isError } = extractResultSummary(step.results as RawRoundResult[]);
      return { ...step, isError };
    })
  );
};
