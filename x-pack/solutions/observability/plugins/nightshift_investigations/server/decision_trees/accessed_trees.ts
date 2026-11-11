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
 * The conversation's rounds that came before `roundId`. Agent Builder starts the post-round
 * workflow before it saves the round, so when the round is not saved yet, every saved round came
 * before it. A later round can already be saved by the time this reads, so it is cut off too.
 */
export const roundsBefore = <TRound extends { id: string }>(
  rounds: readonly TRound[],
  roundId: string
): TRound[] => {
  const index = rounds.findIndex((round) => round.id === roundId);
  return index === -1 ? [...rounds] : rounds.slice(0, index);
};

/** Tree ids the investigator opened or edited in the given rounds. */
export const extractAccessedTreeIdsFromRounds = (
  rounds: ReadonlyArray<{ steps: readonly unknown[] }>
): string[] => [
  ...new Set(
    rounds.flatMap(
      (round) =>
        extractWorkspaceReads(stepsFromRound(round.steps as readonly RawRoundStep[]))
          .decisionTreeIds
    )
  ),
];

/** HTML comment carrying the investigator's ids, so telemetry from the hydrate hook can join to it. */
const RUN_MARKER_PREFIX = '<!-- nightshift-run:';
const RUN_MARKER_RE = /<!-- nightshift-run:conversation=([\w-]*);round=([\w-]*) -->/;

/**
 * The hydrate hook may run on another Kibana node than the reinforcement step, so the ids travel in
 * the prompt rather than in a process-local registry.
 */
export const embedRunMarker = ({
  conversationId,
  roundId,
}: {
  conversationId: string;
  roundId?: string;
}): string => `${RUN_MARKER_PREFIX}conversation=${conversationId};round=${roundId ?? ''} -->`;

export const parseRunMarker = (
  prompt: string | undefined
): { conversationId?: string; roundId?: string } | undefined => {
  const match = prompt ? RUN_MARKER_RE.exec(prompt) : null;
  if (!match) {
    return undefined;
  }
  return {
    ...(match[1] ? { conversationId: match[1] } : {}),
    ...(match[2] ? { roundId: match[2] } : {}),
  };
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
