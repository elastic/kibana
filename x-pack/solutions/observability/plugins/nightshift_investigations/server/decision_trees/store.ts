/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import {
  countsForTree,
  extractMermaid,
  parseStoredDecisionTree,
  symptomSlugFromTreeId,
  symptomTreeId,
  type DecisionTreeCounts,
  type DecisionTreeView,
  type LearningRecord,
} from '@kbn/nightshift-decision-trees';
import {
  DECISION_TREE_AI_INDEX_DEST,
  DECISION_TREE_TAG,
  type DecisionTreeDetail,
  type DecisionTreeStatus,
  type DecisionTreeSummary,
  type DecisionTreeVersionDetail,
  type DecisionTreeVersionSummary,
} from '../../common/decision_trees';

export type {
  DecisionTreeDetail,
  DecisionTreeStatus,
  DecisionTreeSummary,
  DecisionTreeVersionDetail,
  DecisionTreeVersionSummary,
} from '../../common/decision_trees';

const MAX_TREES = 500;
const MAX_VERSIONS = 500;
const SPACE_ID_FIELD = 'attributes.space_id';

/** Head writes that lose an optimistic-concurrency race re-read and retry this many times in all. */
const MAX_WRITE_ATTEMPTS = 5;
const RETRY_DELAY_MS = 50;

/**
 * The head was saved and its counts already include this commit. The version document in `pending`
 * still needs to be written with `writePendingVersion`; a later commit must not apply the same
 * counts again.
 */
export class DecisionTreeVersionWriteError extends Error {
  constructor(public readonly pending: PendingVersionWrite, options?: { cause?: unknown }) {
    const reason = options?.cause instanceof Error ? `: ${options.cause.message}` : '';
    super(`Saved ${pending.treeId} but its version history write failed${reason}`, options);
    this.name = 'DecisionTreeVersionWriteError';
  }
}

/**
 * Structured fields live under `attributes` so they inherit the AI-index template's flattened
 * mapping, the same way Wiki stores `status` / `slug` / `space_id`. The backing index is
 * auto-created on first write from that template; we never call `indices.create`.
 */
interface DecisionTreeAttributes {
  tree_id?: string;
  symptom?: string;
  version?: number | string;
  status?: string;
  author?: string;
  summary?: string;
  reinforced?: boolean | string;
  node_count?: number | string;
  edge_count?: number | string;
  space_id?: string;
  conversation_id?: string;
  round_id?: string;
  workflow_execution_id?: string;
  /**
   * Conversation of the last counts-only write. Kept apart from `conversation_id`, which names the
   * last edit, so a traversal can be traced to its writer without claiming the tree's content.
   */
  counts_conversation_id?: string;
}

/** The head document, one per tree, holding the current markdown and merged learnings. */
interface DecisionTreeHeadSource {
  '@timestamp': string;
  type: 'decision_tree';
  title: string;
  content: string;
  tags: string[];
  attributes?: DecisionTreeAttributes;
  learnings: LearningRecord[];
  evidence_gatherer_metadata?: string[];
  /** Absent on trees written before counts existed; read back as zeros. */
  counts?: DecisionTreeCounts;
}

/** An append-only version document, one per reinforcement turn. */
export interface DecisionTreeVersionSource {
  '@timestamp': string;
  type: 'decision_tree_version';
  title: string;
  content: string;
  tags: string[];
  attributes?: DecisionTreeAttributes;
  learnings: LearningRecord[];
  evidence_gatherer_metadata?: string[];
  counts?: DecisionTreeCounts;
}

/** The stored tree and its counts, so a counts update can build on the latest committed state. */
export interface StoredTreeCounts {
  tree: DecisionTreeView;
  counts: DecisionTreeCounts;
}

/** A version document whose head was saved but which itself was not written yet. */
export interface PendingVersionWrite {
  /** Full `symptom:<slug>` id. */
  treeId: string;
  version: number;
  document: DecisionTreeVersionSource;
  /** The head as saved, which already includes this version's content and counts. */
  head: DecisionTreeDetail;
}

/** What a commit writes: an explicit edit, or the content of the head it re-reads. */
export type DecisionTreeCommitContent =
  | {
      keepHeadContent?: false;
      markdown: string;
      /** Already parsed and validated by the caller, so counts stay consistent with the markdown. */
      tree: DecisionTreeView;
      /** Evidence-node descriptions; persisted so later reads can reapply them. */
      evidenceGathererMetadata: string[];
    }
  | { keepHeadContent: true };

export type DecisionTreeCommitInput = DecisionTreeCommitContent & {
  treeId: string;
  reinforced: boolean;
  author: string;
  summary: string;
  /** Learnings recorded during this turn; merged single-slot into the head. */
  learnings: LearningRecord[];
  conversationId?: string;
  roundId?: string;
  workflowExecutionId?: string;
  /**
   * Builds this version's counts from the stored head, if any. Called again whenever the head
   * write loses a race, so it must derive everything from its argument.
   */
  updateCounts: (previous: StoredTreeCounts | undefined) => DecisionTreeCounts;
};

export interface DecisionTreeStore {
  list: () => Promise<DecisionTreeSummary[]>;
  get: (treeId: string) => Promise<DecisionTreeDetail | undefined>;
  /** Writes a new version of the tree and updates its head. Returns the updated head. */
  commit: (input: DecisionTreeCommitInput) => Promise<DecisionTreeDetail>;
  /** Writes a version document a failed commit left behind; throws DecisionTreeVersionWriteError again on failure. */
  writePendingVersion: (pending: PendingVersionWrite) => Promise<void>;
  /**
   * Ids of the trees with a version written from this investigation's rounds. The investigation id
   * is its conversation id, which `commit` stamps on each version as `conversation_id`.
   */
  listTreeIdsForInvestigation: (investigationId: string) => Promise<string[]>;
  /**
   * Rewrites only the head's counts, without a new version. Returns `undefined` when the tree
   * does not exist. `reinforced` promotes the tree to established, as a reinforced commit does.
   * `conversationId` is recorded as the head's `counts_conversation_id`.
   */
  updateCounts: (input: {
    treeId: string;
    update: (current: StoredTreeCounts) => DecisionTreeCounts;
    reinforced?: boolean;
    conversationId?: string;
  }) => Promise<DecisionTreeDetail | undefined>;
  listVersions: (treeId: string) => Promise<DecisionTreeVersionSummary[]>;
  getVersion: (treeId: string, version: number) => Promise<DecisionTreeVersionDetail | undefined>;
  archive: (treeId: string) => Promise<void>;
}

/** A head document with the sequence number and primary term it was read at. */
interface StoredHead {
  source: DecisionTreeHeadSource;
  seqNo?: number;
  primaryTerm?: number;
}

/** Turns `checkout-high-latency` into `Checkout High Latency` for the tree title. */
const titleFromSymptom = (symptom: string): string =>
  symptom
    .split('-')
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const headDocId = (spaceId: string, symptom: string): string => `${spaceId}:dtree_${symptom}`;

const versionDocId = (spaceId: string, symptom: string, version: number): string =>
  `${spaceId}:dtree_${symptom}_v${version}`;

/**
 * A stored tree whose Mermaid can no longer be extracted is still returned, with an empty
 * `mermaid`. A corrupt stored page should not stop the agent from replacing it, and the guardrails
 * treat a missing original as "no baseline to compare against".
 */
const safeExtractMermaid = (markdown: string): string => {
  try {
    return extractMermaid(markdown);
  } catch {
    return '';
  }
};

/** Single-slot key: recording the same tree/kind/category/connector replaces the previous learning. */
const learningKey = (learning: LearningRecord): string =>
  `${learning.tree_id ?? ''}\u0000${learning.kind}\u0000${learning.category ?? ''}\u0000${
    learning.connector_name ?? ''
  }`;

/** Merges this turn's learnings into the tree's existing set, newest winning per slot. */
const mergeLearnings = (
  existing: LearningRecord[],
  incoming: LearningRecord[]
): LearningRecord[] => {
  const bySlot = new Map<string, LearningRecord>();
  for (const learning of existing) {
    bySlot.set(learningKey(learning), learning);
  }
  for (const learning of incoming) {
    bySlot.set(learningKey(learning), learning);
  }
  return [...bySlot.values()];
};

/** Flattened attributes may come back as strings; coerce the same way Wiki does. */
const toCount = (value: number | string | undefined, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
  }
  return fallback;
};

const toStatus = (value: string | undefined): DecisionTreeStatus =>
  value === 'established' || value === 'archived' || value === 'tentative' ? value : 'tentative';

const toBool = (value: boolean | string | undefined): boolean => value === true || value === 'true';

const headToSummary = (source: DecisionTreeHeadSource): DecisionTreeSummary => ({
  tree_id: source.attributes?.tree_id ?? '',
  symptom: source.attributes?.symptom ?? '',
  title: source.title,
  status: toStatus(source.attributes?.status),
  version: toCount(source.attributes?.version),
  node_count: toCount(source.attributes?.node_count),
  edge_count: toCount(source.attributes?.edge_count),
  learning_count: source.learnings.length,
  updated_at: source['@timestamp'],
  ...(source.attributes?.conversation_id
    ? { conversation_id: source.attributes.conversation_id }
    : {}),
  ...(source.attributes?.round_id ? { round_id: source.attributes.round_id } : {}),
  ...(source.attributes?.workflow_execution_id
    ? { workflow_execution_id: source.attributes.workflow_execution_id }
    : {}),
});

/** Parses the stored tree and lays its counts over every node and edge, zero where unset. */
const storedTreeCounts = (
  source: DecisionTreeHeadSource | DecisionTreeVersionSource
): StoredTreeCounts => {
  const tree = parseStoredDecisionTree(
    safeExtractMermaid(source.content),
    source.attributes?.tree_id ?? '',
    source.evidence_gatherer_metadata ?? []
  );
  return { tree, counts: countsForTree(tree, source.counts) };
};

const headToDetail = (source: DecisionTreeHeadSource): DecisionTreeDetail => ({
  ...headToSummary(source),
  markdown: source.content,
  mermaid: safeExtractMermaid(source.content),
  evidence_gatherer_metadata: source.evidence_gatherer_metadata ?? [],
  learnings: source.learnings,
  counts: storedTreeCounts(source).counts,
});

const versionToSummary = (source: DecisionTreeVersionSource): DecisionTreeVersionSummary => ({
  version: toCount(source.attributes?.version),
  author: source.attributes?.author ?? '',
  summary: source.attributes?.summary ?? '',
  reinforced: toBool(source.attributes?.reinforced),
  node_count: toCount(source.attributes?.node_count),
  edge_count: toCount(source.attributes?.edge_count),
  learning_count: source.learnings.length,
  created_at: source['@timestamp'],
  ...(source.attributes?.conversation_id
    ? { conversation_id: source.attributes.conversation_id }
    : {}),
  ...(source.attributes?.round_id ? { round_id: source.attributes.round_id } : {}),
  ...(source.attributes?.workflow_execution_id
    ? { workflow_execution_id: source.attributes.workflow_execution_id }
    : {}),
});

const versionToDetail = (source: DecisionTreeVersionSource): DecisionTreeVersionDetail => ({
  ...versionToSummary(source),
  tree_id: source.attributes?.tree_id ?? '',
  markdown: source.content,
  mermaid: safeExtractMermaid(source.content),
  evidence_gatherer_metadata: source.evidence_gatherer_metadata ?? [],
  learnings: source.learnings,
  counts: storedTreeCounts(source).counts,
});

/** Create-only for a new head; otherwise compare-and-set against the read it was based on. */
const writePrecondition = (
  readAt: StoredHead | undefined
):
  | { op_type: 'create' }
  | { if_seq_no: number; if_primary_term: number }
  | Record<string, never> => {
  if (!readAt) {
    return { op_type: 'create' };
  }
  const { seqNo, primaryTerm } = readAt;
  return seqNo !== undefined && primaryTerm !== undefined
    ? { if_seq_no: seqNo, if_primary_term: primaryTerm }
    : {};
};

/**
 * The content a commit writes: its explicit edit, or what this attempt's head read holds, so a
 * retry after a lost race keeps the newer head's content rather than an older snapshot.
 */
const commitContent = (
  content: DecisionTreeCommitContent,
  existing: StoredHead | undefined,
  fullTreeId: string
): { markdown: string; tree: DecisionTreeView; evidenceGathererMetadata: string[] } => {
  if (!content.keepHeadContent) {
    const { markdown, tree, evidenceGathererMetadata } = content;
    return { markdown, tree, evidenceGathererMetadata };
  }
  if (!existing) {
    throw new Error(`Cannot keep the content of ${fullTreeId}: it does not exist`);
  }
  return {
    markdown: existing.source.content,
    tree: storedTreeCounts(existing.source).tree,
    evidenceGathererMetadata: existing.source.evidence_gatherer_metadata ?? [],
  };
};

const isConflict = (error: unknown): boolean => isResponseError(error) && error.statusCode === 409;

/** A 4xx other than a timeout or throttle fails the same way again, so it is not retried. */
const isPermanentClientError = (error: unknown): boolean =>
  isResponseError(error) &&
  error.statusCode !== undefined &&
  error.statusCode >= 400 &&
  error.statusCode < 500 &&
  error.statusCode !== 408 &&
  error.statusCode !== 429;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs `attempt` again after a version conflict, up to {@link MAX_WRITE_ATTEMPTS} times in all. */
const retryOnConflict = async <Result>(attempt: () => Promise<Result>): Promise<Result> => {
  for (let attemptNumber = 1; ; attemptNumber++) {
    try {
      return await attempt();
    } catch (error) {
      if (!isConflict(error) || attemptNumber >= MAX_WRITE_ATTEMPTS) {
        throw error;
      }
      await delay(RETRY_DELAY_MS * attemptNumber);
    }
  }
};

export const createDecisionTreeStore = ({
  esClient,
  logger,
  spaceId,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  /** Aborts in-flight Elasticsearch requests when the calling step times out. */
  signal?: AbortSignal;
}): DecisionTreeStore => {
  const getHead = async (symptom: string): Promise<StoredHead | undefined> => {
    try {
      const response = await esClient.get<DecisionTreeHeadSource>(
        {
          index: DECISION_TREE_AI_INDEX_DEST,
          id: headDocId(spaceId, symptom),
        },
        { signal }
      );
      if (!response.found || !response._source) {
        return undefined;
      }
      return {
        source: response._source,
        seqNo: response._seq_no,
        primaryTerm: response._primary_term,
      };
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  };

  /** Retries the version document alone; the head it belongs to is already saved. */
  const writeVersion = async (pending: PendingVersionWrite): Promise<void> => {
    const id = versionDocId(spaceId, symptomSlugFromTreeId(pending.treeId), pending.version);
    for (let attemptNumber = 1; ; attemptNumber++) {
      try {
        await esClient.index(
          {
            index: DECISION_TREE_AI_INDEX_DEST,
            id,
            document: pending.document,
            // The last write of a commit, so version history is searchable as soon as it returns.
            refresh: 'wait_for',
          },
          { signal }
        );
        return;
      } catch (error) {
        if (
          signal?.aborted ||
          isPermanentClientError(error) ||
          attemptNumber >= MAX_WRITE_ATTEMPTS
        ) {
          throw new DecisionTreeVersionWriteError(pending, { cause: error });
        }
        await delay(RETRY_DELAY_MS * attemptNumber);
      }
    }
  };

  /**
   * Writes the head only if it is unchanged since `readAt` was read, or only if it still does not
   * exist when there was none, so a concurrent writer surfaces as a 409 instead of a lost update.
   */
  const writeHead = async (
    symptom: string,
    document: DecisionTreeHeadSource,
    readAt: StoredHead | undefined
  ): Promise<void> => {
    await esClient.index(
      {
        index: DECISION_TREE_AI_INDEX_DEST,
        id: headDocId(spaceId, symptom),
        document,
        refresh: 'wait_for',
        ...writePrecondition(readAt),
      },
      { signal }
    );
  };

  return {
    list: async () => {
      const response = await esClient.search<DecisionTreeHeadSource>(
        {
          index: DECISION_TREE_AI_INDEX_DEST,
          ignore_unavailable: true,
          allow_no_indices: true,
          size: MAX_TREES,
          track_total_hits: false,
          query: {
            bool: {
              filter: [
                { term: { type: 'decision_tree' } },
                { term: { tags: DECISION_TREE_TAG } },
                { term: { [SPACE_ID_FIELD]: spaceId } },
              ],
            },
          },
          sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
        },
        { signal }
      );

      return response.hits.hits.flatMap((hit) => (hit._source ? [headToSummary(hit._source)] : []));
    },

    get: async (treeId) => {
      const head = await getHead(symptomSlugFromTreeId(treeId));
      return head ? headToDetail(head.source) : undefined;
    },

    commit: async (input) => {
      const {
        treeId,
        reinforced,
        author,
        summary,
        learnings,
        conversationId,
        roundId,
        workflowExecutionId,
        updateCounts,
      } = input;
      const symptom = symptomSlugFromTreeId(treeId);
      const fullTreeId = symptomTreeId(symptom);
      const tags = ['nightshift', DECISION_TREE_TAG];
      const provenanceAttrs = {
        ...(conversationId ? { conversation_id: conversationId } : {}),
        ...(roundId ? { round_id: roundId } : {}),
        ...(workflowExecutionId ? { workflow_execution_id: workflowExecutionId } : {}),
      };

      // The head is written first and conditionally: winning that write is what claims the version
      // number, so a racing commit retries with the next one instead of overwriting this version.
      const { headDoc, versionDoc, version } = await retryOnConflict(async () => {
        const existing = await getHead(symptom);
        const { markdown, tree, evidenceGathererMetadata } = commitContent(
          input,
          existing,
          fullTreeId
        );
        const nextVersion = toCount(existing?.source.attributes?.version) + 1;
        // A human-confirmed root cause is what promotes a tree from tentative to established; an
        // ordinary turn leaves the status where it was.
        const status: DecisionTreeStatus = reinforced
          ? 'established'
          : toStatus(existing?.source.attributes?.status);
        const title = existing?.source.title ?? titleFromSymptom(symptom);
        const counts = updateCounts(existing ? storedTreeCounts(existing.source) : undefined);
        const now = new Date().toISOString();
        const sharedAttributes = {
          tree_id: fullTreeId,
          symptom,
          version: nextVersion,
          node_count: tree.nodes.length,
          edge_count: tree.edges.length,
          space_id: spaceId,
          ...provenanceAttrs,
        };

        const head: DecisionTreeHeadSource = {
          '@timestamp': now,
          type: 'decision_tree',
          title,
          content: markdown,
          tags,
          attributes: { ...sharedAttributes, status },
          learnings: mergeLearnings(existing?.source.learnings ?? [], learnings),
          evidence_gatherer_metadata: evidenceGathererMetadata,
          counts,
        };
        await writeHead(symptom, head, existing);

        const versionSource: DecisionTreeVersionSource = {
          '@timestamp': now,
          type: 'decision_tree_version',
          title: `${title} v${nextVersion}`,
          content: markdown,
          tags,
          attributes: { ...sharedAttributes, author, summary, reinforced },
          learnings,
          evidence_gatherer_metadata: evidenceGathererMetadata,
          counts,
        };
        return { headDoc: head, versionDoc: versionSource, version: nextVersion };
      });

      // The head already holds this version and its counts. Retry only this document: running the
      // commit again would increment the visit and reinforcement counts a second time.
      const head = headToDetail(headDoc);
      await writeVersion({ treeId: fullTreeId, version, document: versionDoc, head });

      logger.debug(`Committed decision tree ${fullTreeId} v${version}`);
      return head;
    },

    writePendingVersion: async (pending) => {
      await writeVersion(pending);
      logger.debug(`Wrote pending version ${pending.treeId} v${pending.version}`);
    },

    updateCounts: async ({ treeId, update, reinforced = false, conversationId }) => {
      const symptom = symptomSlugFromTreeId(treeId);
      return retryOnConflict(async () => {
        const existing = await getHead(symptom);
        if (!existing) {
          return undefined;
        }
        const { source } = existing;
        // Counts are not an edit to the tree, so `@timestamp` (its last edit) stays put.
        const head: DecisionTreeHeadSource = {
          ...source,
          attributes: {
            ...source.attributes,
            ...(reinforced ? { status: 'established' } : {}),
            ...(conversationId ? { counts_conversation_id: conversationId } : {}),
          },
          counts: update(storedTreeCounts(source)),
        };
        await writeHead(symptom, head, existing);
        return headToDetail(head);
      });
    },

    listTreeIdsForInvestigation: async (investigationId) => {
      // Buckets by tree rather than reading version hits, so a tree with many versions cannot
      // push the investigation's other trees out of the response.
      const response = await esClient.search<
        DecisionTreeVersionSource,
        { tree_ids: { buckets: Array<{ key: string }> } }
      >(
        {
          index: DECISION_TREE_AI_INDEX_DEST,
          ignore_unavailable: true,
          allow_no_indices: true,
          size: 0,
          track_total_hits: false,
          query: {
            bool: {
              filter: [
                // The head carries the last writer's conversation, so only versions say every
                // investigation that wrote the tree.
                { term: { type: 'decision_tree_version' } },
                { term: { 'attributes.conversation_id': investigationId } },
                { term: { [SPACE_ID_FIELD]: spaceId } },
              ],
            },
          },
          aggs: { tree_ids: { terms: { field: 'attributes.tree_id', size: MAX_TREES } } },
        },
        { signal }
      );

      return (response.aggregations?.tree_ids.buckets ?? []).map((bucket) => bucket.key);
    },

    listVersions: async (treeId) => {
      const response = await esClient.search<DecisionTreeVersionSource>(
        {
          index: DECISION_TREE_AI_INDEX_DEST,
          ignore_unavailable: true,
          allow_no_indices: true,
          size: MAX_VERSIONS,
          track_total_hits: false,
          query: {
            bool: {
              filter: [
                { term: { type: 'decision_tree_version' } },
                { term: { 'attributes.tree_id': symptomTreeId(symptomSlugFromTreeId(treeId)) } },
                { term: { [SPACE_ID_FIELD]: spaceId } },
              ],
            },
          },
          sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
        },
        { signal }
      );

      return response.hits.hits.flatMap((hit) =>
        hit._source ? [versionToSummary(hit._source)] : []
      );
    },

    getVersion: async (treeId, version) => {
      try {
        const response = await esClient.get<DecisionTreeVersionSource>(
          {
            index: DECISION_TREE_AI_INDEX_DEST,
            id: versionDocId(spaceId, symptomSlugFromTreeId(treeId), version),
          },
          { signal }
        );
        return response.found && response._source ? versionToDetail(response._source) : undefined;
      } catch (error) {
        if (isResponseError(error) && error.statusCode === 404) {
          return undefined;
        }
        throw error;
      }
    },

    archive: async (treeId) => {
      const symptom = symptomSlugFromTreeId(treeId);
      await retryOnConflict(async () => {
        const existing = await getHead(symptom);
        if (!existing) {
          return;
        }
        await writeHead(
          symptom,
          {
            ...existing.source,
            '@timestamp': new Date().toISOString(),
            attributes: { ...existing.source.attributes, status: 'archived', space_id: spaceId },
          },
          existing
        );
      });
    },
  };
};
