/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { symptomTreeId } from '@kbn/nightshift-decision-trees';
import {
  extractWorkspaceReads,
  extractWorkspaceReadsFromToolCalls,
  stepsFromRound,
  type RawRoundStep,
} from '../investigation_round';

/** One post-execution tool call, matching Agent Builder's after-execution workflow payload. */
export interface InvestigationToolCall {
  tool_id?: string;
  tool_call_id?: string;
  params?: Record<string, unknown>;
  results?: unknown[];
}

/** HTML comment the reinforcement message carries so its beforeAgent hydrate can filter. */
export const ACCESSED_TREES_MARKER_PREFIX = '<!-- nightshift-accessed-trees:';
const ACCESSED_TREES_MARKER_RE = /<!-- nightshift-accessed-trees:([a-z0-9,-]*) -->/;

/**
 * Tree ids whose markdown the investigator actually opened or edited.
 * Opening `monitors.md` does not count — that is the index, not a tree.
 */
export const extractAccessedTreeIds = (toolCalls: InvestigationToolCall[]): string[] =>
  extractWorkspaceReadsFromToolCalls(toolCalls).decisionTreeIds;

/**
 * Tree ids the investigator opened or edited in the conversation's other rounds. The round being
 * reinforced is skipped: it may not be saved yet, so its own tool calls come from the hook.
 */
export const extractAccessedTreeIdsFromRounds = (
  rounds: ReadonlyArray<{ id: string; steps: readonly unknown[] }>,
  currentRoundId: string | undefined
): string[] => [
  ...new Set(
    rounds
      .filter((round) => round.id !== currentRoundId)
      .flatMap(
        (round) =>
          extractWorkspaceReads(stepsFromRound(round.steps as readonly RawRoundStep[]))
            .decisionTreeIds
      )
  ),
];

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
