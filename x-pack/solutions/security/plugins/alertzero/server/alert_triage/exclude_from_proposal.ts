/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProposalConflictError } from '@kbn/proposals-plugin/server';
import type { GroupingHead } from './group_proposals';

export const PROPOSAL_TAG_PREFIX = 'az:proposal:';

const FALSE_POSITIVE_TAG = 'az:false_positive';
const OTHER_VERDICT_TAGS = ['az:true_positive', 'az:inconclusive'] as const;
export const TRUE_POSITIVE_TAG = 'az:true_positive';

/** A proposal head, with the comment the exclusion adds a line to. */
export interface ExclusionHead extends GroupingHead {
  comment?: string;
}

export interface ExcludedGroup {
  rootProposalId: string;
  alertIds: string[];
  truePositiveIds: string[];
}

export interface ExclusionResult {
  rootProposalId: string;
  conversationId: string;
  revision: number;
  /** The alerts the proposal held and an analyst excluded. */
  excludedIds: string[];
  truePositiveCount: number;
  remainingCount: number;
  /** False when the proposal still lists the alerts, so only the close re-check protects them. */
  revised: boolean;
}

export interface ExclusionDeps {
  listHeads: (rootIds: string[]) => Promise<ExclusionHead[]>;
  revise: (
    head: ExclusionHead,
    remainingIds: string[],
    excluded: { count: number; truePositiveCount: number }
  ) => Promise<{ proposalId: string; revision: number }>;
  onError?: (message: string) => void;
}

/**
 * The alerts an analyst excluded, by proposal. An alert in a proposal is excluded when it carries
 * another verdict tag, or has lost `az:false_positive`. Whether the proposal is still pending is
 * decided against the live head, not here.
 */
export const groupExcludedAlerts = (
  alerts: ReadonlyArray<{ id: string; tags: readonly string[] }>
): ExcludedGroup[] => {
  const groups = new Map<string, ExcludedGroup>();
  for (const { id, tags } of alerts) {
    const isExcluded =
      !tags.includes(FALSE_POSITIVE_TAG) || OTHER_VERDICT_TAGS.some((tag) => tags.includes(tag));
    if (!isExcluded) continue;
    for (const tag of tags) {
      if (!tag.startsWith(PROPOSAL_TAG_PREFIX)) continue;
      const rootProposalId = tag.slice(PROPOSAL_TAG_PREFIX.length);
      const group = groups.get(rootProposalId) ?? {
        rootProposalId,
        alertIds: [],
        truePositiveIds: [],
      };
      group.alertIds.push(id);
      if (tags.includes(TRUE_POSITIVE_TAG)) group.truePositiveIds.push(id);
      groups.set(rootProposalId, group);
    }
  }
  return [...groups.values()];
};

/**
 * Takes the excluded alerts out of one proposal, revising exactly the head it read. One retry: a
 * conflict means a join or a decision got there first, so the second attempt reads the head again,
 * keeps what the join added, and gives up if the proposal is no longer pending.
 */
const excludeFromHead = async (
  group: ExcludedGroup,
  head: ExclusionHead,
  deps: ExclusionDeps
): Promise<ExclusionResult | undefined> => {
  let current: ExclusionHead | undefined = head;
  for (let attempt = 0; attempt < 2 && current; attempt++) {
    if (current.status !== 'pending' || current.decision !== undefined) return undefined;
    const held = new Set(current.alertIds);
    const excludedIds = group.alertIds.filter((id) => held.has(id));
    // Nothing to remove: an earlier event already did it, or the alert joined a different proposal.
    if (excludedIds.length === 0) return undefined;
    const truePositiveCount = group.truePositiveIds.filter((id) => held.has(id)).length;
    const remaining = current.alertIds.filter((id) => !excludedIds.includes(id));
    const base = {
      rootProposalId: current.rootProposalId,
      conversationId: current.conversationId,
      excludedIds,
      truePositiveCount,
    };
    try {
      const { revision } = await deps.revise(current, remaining, {
        count: excludedIds.length,
        truePositiveCount,
      });
      return { ...base, revision, remainingCount: remaining.length, revised: true };
    } catch (error) {
      if (error instanceof ProposalConflictError && attempt === 0) {
        [current] = await deps.listHeads([current.rootProposalId]);
        continue;
      }
      // Not a conflict, or a second one: for example the caller may not revise proposals. The alerts
      // stay listed.
      deps.onError?.(`Could not revise ${current.proposalId}: ${(error as Error).message}`);
      return {
        ...base,
        revision: current.revision,
        remainingCount: current.alertIds.length,
        revised: false,
      };
    }
  }
  // The head is gone after a conflict.
  return undefined;
};

/** Excludes the alerts of every group from the pending proposal that holds them. */
export const excludeFromProposals = async (
  groups: readonly ExcludedGroup[],
  deps: ExclusionDeps
): Promise<ExclusionResult[]> => {
  if (groups.length === 0) return [];
  const heads = await deps.listHeads(groups.map(({ rootProposalId }) => rootProposalId));
  const results: ExclusionResult[] = [];
  for (const group of groups) {
    const head = heads.find(({ rootProposalId }) => rootProposalId === group.rootProposalId);
    if (!head) continue;
    const result = await excludeFromHead(group, head, deps);
    if (result) results.push(result);
  }
  return results;
};
