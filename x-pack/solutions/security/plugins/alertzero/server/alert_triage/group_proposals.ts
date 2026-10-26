/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProposalConflictError } from '@kbn/proposals-plugin/server';
import { buildProposalId } from '../services/proposals/dedup/proposal_id';
import {
  GROUPED_PROPOSAL_JOIN_MARGIN_MS,
  GROUPED_PROPOSAL_MAX_ALERTS,
  GROUPED_PROPOSAL_MAX_GENERATIONS,
  GROUPED_PROPOSAL_MAX_REVISIONS,
} from './constants';

/** The live revision of one generation of a key, as far as joining it needs to know. */
export interface GroupingHead {
  /** The live revision, which is not the generation's root once it has been revised. */
  proposalId: string;
  rootProposalId: string;
  revision: number;
  status: string;
  decision?: string;
  expiresAt?: string;
  previousExecutionError?: string;
  conversationId: string;
  alertIds: readonly string[];
  /** The execution of the proposal's gate, which must still wait for input for a join to be safe. */
  workflowExecutionId?: string;
}

export interface KeyGroup {
  keyHash: string;
  alertIds: readonly string[];
}

export interface GroupingDeps {
  /** One search for the live head of every chain whose root is in `rootIds`. */
  listHeads: (rootIds: string[]) => Promise<GroupingHead[]>;
  /** The checks that need a read: the gate still waits for input and the Investigation is open. */
  canJoin: (head: GroupingHead) => Promise<boolean>;
  /** Revises exactly `head`, so an edit made after the read is refused as a conflict. */
  revise: (
    head: GroupingHead,
    alertIds: string[]
  ) => Promise<{ proposalId: string; revision: number }>;
  newId: () => string;
  onError?: (message: string) => void;
}

export interface GroupedMint {
  proposalId: string;
  alertIds: string[];
  /** `keyed`: a generation of the key. `pooled`: lone alerts of the batch. `overflow`: every generation is used. */
  kind: 'keyed' | 'pooled' | 'overflow';
}

export interface GroupedJoin {
  rootProposalId: string;
  /** The revision the join created. */
  proposalId: string;
  revision: number;
  conversationId: string;
  /** Only the alerts the head did not already hold. */
  alertIds: string[];
}

export interface GroupingPlan {
  mints: GroupedMint[];
  joins: GroupedJoin[];
}

/** The ids of generations 0 to N of a key, in generation order. */
export const generationIds = (spaceId: string, keyHash: string): string[] =>
  Array.from({ length: GROUPED_PROPOSAL_MAX_GENERATIONS }, (_, generation) =>
    buildProposalId({ spaceId, subjectKey: keyHash, generation })
  );

/**
 * Whether a head takes `adding` more alerts. The deadline margin gives a joined alert time to be
 * reviewed before the proposal expires and its alerts are re-tagged.
 */
export const isJoinableHead = (head: GroupingHead, adding: number, now: number): boolean =>
  head.status === 'pending' &&
  head.decision === undefined &&
  head.previousExecutionError === undefined &&
  (head.expiresAt === undefined ||
    Date.parse(head.expiresAt) - now > GROUPED_PROPOSAL_JOIN_MARGIN_MS) &&
  head.revision < GROUPED_PROPOSAL_MAX_REVISIONS &&
  head.alertIds.length + adding <= GROUPED_PROPOSAL_MAX_ALERTS;

const union = (existing: readonly string[], added: readonly string[]): string[] => [
  ...new Set([...existing, ...added]),
];

/**
 * Adds alerts to a head, revising exactly the revision it read. One retry: a conflict means someone
 * else revised the head, so the second attempt reads it again. Undefined when the head cannot take them.
 */
export const tryJoinHead = async ({
  head,
  alertIds,
  now,
  deps,
}: {
  head: GroupingHead;
  alertIds: readonly string[];
  now: number;
  deps: GroupingDeps;
}): Promise<GroupedJoin | undefined> => {
  let current: GroupingHead | undefined = head;
  for (let attempt = 0; attempt < 2 && current; attempt++) {
    const added = alertIds.filter((id) => !current?.alertIds.includes(id));
    if (!isJoinableHead(current, added.length, now) || !(await deps.canJoin(current))) {
      return undefined;
    }
    try {
      const { proposalId, revision } = await deps.revise(current, union(current.alertIds, added));
      return {
        rootProposalId: current.rootProposalId,
        proposalId,
        revision,
        conversationId: current.conversationId,
        alertIds: added,
      };
    } catch (error) {
      if (!(error instanceof ProposalConflictError)) throw error;
      [current] = await deps.listHeads([current.rootProposalId]);
    }
  }
  return undefined;
};

/**
 * Decides, for each key of a batch, whether its confident false positives join an open proposal of
 * that key or start a new one. Lone alerts that join nothing go into one pooled proposal when
 * `pool` is set. No alert is dropped: whatever cannot join is minted.
 */
export const groupFpCandidates = async ({
  keys,
  spaceId,
  now,
  pool,
  deps,
}: {
  keys: readonly KeyGroup[];
  spaceId: string;
  now: number;
  pool: boolean;
  deps: GroupingDeps;
}): Promise<GroupingPlan> => {
  const idsByKey = new Map(keys.map(({ keyHash }) => [keyHash, generationIds(spaceId, keyHash)]));
  const generationOf = new Map<string, { keyHash: string; generation: number }>();
  for (const [keyHash, ids] of idsByKey) {
    ids.forEach((id, generation) => generationOf.set(id, { keyHash, generation }));
  }
  const headsByKey = new Map<string, Array<GroupingHead & { generation: number }>>();
  for (const head of await deps.listHeads([...generationOf.keys()])) {
    const found = generationOf.get(head.rootProposalId);
    if (found) {
      headsByKey.set(found.keyHash, [
        ...(headsByKey.get(found.keyHash) ?? []),
        { ...head, generation: found.generation },
      ]);
    }
  }

  const plan: GroupingPlan = { mints: [], joins: [] };
  const pooled: string[] = [];
  for (const { keyHash, alertIds } of keys) {
    const heads = [...(headsByKey.get(keyHash) ?? [])].sort((a, b) => a.generation - b.generation);
    let join: GroupedJoin | undefined;
    let failed = false;
    for (const head of heads) {
      if (!isJoinableHead(head, alertIds.length, now)) continue;
      try {
        join = await tryJoinHead({ head, alertIds, now, deps });
      } catch (error) {
        // Not a conflict: the alerts still need a proposal, and a random id cannot collide.
        deps.onError?.(`Could not join ${head.proposalId}: ${(error as Error).message}`);
        failed = true;
      }
      if (join || failed) break;
    }
    if (join) {
      plan.joins.push(join);
    } else if (pool && alertIds.length === 1 && !failed) {
      pooled.push(...alertIds);
    } else {
      const taken = new Set(heads.map(({ generation }) => generation));
      const free = (idsByKey.get(keyHash) ?? []).findIndex(
        (_, generation) => !taken.has(generation)
      );
      const proposalId =
        failed || free === -1
          ? deps.newId()
          : buildProposalId({ spaceId, subjectKey: keyHash, generation: free });
      plan.mints.push({
        proposalId,
        alertIds: [...alertIds],
        kind: failed || free === -1 ? 'overflow' : 'keyed',
      });
    }
  }
  if (pooled.length > 0) {
    plan.mints.push({ proposalId: deps.newId(), alertIds: pooled, kind: 'pooled' });
  }
  return plan;
};
