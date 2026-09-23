/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { symptomTreeId } from '@kbn/nightshift-decision-trees';
import { SANDBOX_BASH_TOOL_ID } from '../tools/sandbox_bash/tool';
import { SANDBOX_STR_REPLACE_TOOL_ID } from '../tools/sandbox_bash/str_replace_tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../tools/sandbox_bash/view_file_tool';
import { SANDBOX_WRITE_FILE_TOOL_ID } from '../tools/sandbox_bash/write_file_tool';

/** One post-execution tool call, matching Agent Builder's after-execution workflow payload. */
export interface InvestigationToolCall {
  tool_id?: string;
  params?: Record<string, unknown>;
}

const TREE_FILE_RE = /(?:^|\/)decision_tree_([a-z0-9]+(?:-[a-z0-9]+)*)\.md(?:$|[^a-z0-9-])/g;

const FILE_TOOLS = new Set([
  SANDBOX_VIEW_FILE_TOOL_ID,
  SANDBOX_STR_REPLACE_TOOL_ID,
  SANDBOX_WRITE_FILE_TOOL_ID,
]);

/** HTML comment the reinforcement message carries so its beforeAgent hydrate can filter. */
export const ACCESSED_TREES_MARKER_PREFIX = '<!-- nightshift-accessed-trees:';
const ACCESSED_TREES_MARKER_RE = /<!-- nightshift-accessed-trees:([a-z0-9,-]*) -->/;

const slugsFromHaystack = (haystack: string): string[] => {
  const slugs: string[] = [];
  TREE_FILE_RE.lastIndex = 0;
  let match = TREE_FILE_RE.exec(haystack);
  while (match) {
    slugs.push(match[1]);
    match = TREE_FILE_RE.exec(haystack);
  }
  return slugs;
};

const haystacksFromCall = (call: InvestigationToolCall): string[] => {
  const { tool_id: toolId, params } = call;
  if (!toolId || !params) {
    return [];
  }
  if (FILE_TOOLS.has(toolId) && typeof params.file_path === 'string') {
    return [params.file_path];
  }
  if (toolId === SANDBOX_BASH_TOOL_ID && typeof params.command === 'string') {
    return [params.command];
  }
  return [];
};

/**
 * Tree ids whose markdown the investigator actually opened or edited.
 * Opening `monitors.md` does not count — that is the index, not a tree.
 */
export const extractAccessedTreeIds = (toolCalls: InvestigationToolCall[]): string[] => {
  const seen = new Set<string>();
  for (const call of toolCalls) {
    for (const haystack of haystacksFromCall(call)) {
      for (const slug of slugsFromHaystack(haystack)) {
        seen.add(symptomTreeId(slug));
      }
    }
  }
  return [...seen];
};

/** First line of the reinforcement message; hydrate uses it to restrict the sandbox. */
export const embedAccessedTreesMarker = (treeIds: string[]): string => {
  const slugs = treeIds.map((treeId) => treeId.replace(/^symptom:/, '')).join(',');
  return `${ACCESSED_TREES_MARKER_PREFIX}${slugs} -->`;
};

/**
 * `undefined` means the prompt has no marker (investigator hydrate: write every tree).
 * An array means reinforcement hydrate: write only those slugs, possibly none.
 */
export const parseAccessedTreesMarker = (prompt: string | undefined): string[] | undefined => {
  if (!prompt) {
    return undefined;
  }
  const match = ACCESSED_TREES_MARKER_RE.exec(prompt);
  if (!match) {
    return undefined;
  }
  const raw = match[1];
  if (!raw) {
    return [];
  }
  return raw.split(',').filter(Boolean).map(symptomTreeId);
};
