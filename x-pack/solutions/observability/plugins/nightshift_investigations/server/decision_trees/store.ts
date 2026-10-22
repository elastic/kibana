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
 * Structured fields live under `attributes` so they inherit the AI-index template's flattened
 * mapping, the same way Cortex stores `status` / `slug` / `space_id`. The backing index is
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
interface DecisionTreeVersionSource {
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

export interface DecisionTreeStore {
  list: () => Promise<DecisionTreeSummary[]>;
  get: (treeId: string) => Promise<DecisionTreeDetail | undefined>;
  /** Writes a new version of the tree and updates its head. Returns the updated head. */
  commit: (input: {
    treeId: string;
    markdown: string;
    /** Already parsed and validated by the caller, so counts stay consistent with the markdown. */
    tree: DecisionTreeView;
    reinforced: boolean;
    author: string;
    summary: string;
    /** Learnings recorded during this turn; merged single-slot into the head. */
    learnings: LearningRecord[];
    /** Evidence-node descriptions; persisted so later reads can reapply them. */
    evidenceGathererMetadata: string[];
    /**
     * Builds this version's counts from the stored head, if any. Called again whenever the head
     * write loses a race, so it must derive everything from its argument.
     */
    updateCounts: (previous: StoredTreeCounts | undefined) => DecisionTreeCounts;
  }) => Promise<DecisionTreeDetail>;
  /**
   * Rewrites only the head's counts, without a new version. Returns `undefined` when the tree
   * does not exist. `reinforced` promotes the tree to established, as a reinforced commit does.
   */
  updateCounts: (input: {
    treeId: string;
    update: (current: StoredTreeCounts) => DecisionTreeCounts;
    reinforced?: boolean;
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

/** Flattened attributes may come back as strings; coerce the same way Cortex does. */
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

const isConflict = (error: unknown): boolean => isResponseError(error) && error.statusCode === 409;

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

    commit: async ({
      treeId,
      markdown,
      tree,
      reinforced,
      author,
      summary,
      learnings,
      evidenceGathererMetadata,
      updateCounts,
    }) => {
      const symptom = symptomSlugFromTreeId(treeId);
      const fullTreeId = symptomTreeId(symptom);
      const tags = ['nightshift', DECISION_TREE_TAG];

      // The head is written first and conditionally: winning that write is what claims the version
      // number, so a racing commit retries with the next one instead of overwriting this version.
      const { headDoc, versionDoc, version } = await retryOnConflict(async () => {
        const existing = await getHead(symptom);
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

      await esClient.index(
        {
          index: DECISION_TREE_AI_INDEX_DEST,
          id: versionDocId(spaceId, symptom, version),
          document: versionDoc,
          // The last write of a commit, so version history is searchable as soon as it returns.
          refresh: 'wait_for',
        },
        { signal }
      );

      logger.debug(`Committed decision tree ${fullTreeId} v${version}`);
      return headToDetail(headDoc);
    },

    updateCounts: async ({ treeId, update, reinforced = false }) => {
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
          },
          counts: update(storedTreeCounts(source)),
        };
        await writeHead(symptom, head, existing);
        return headToDetail(head);
      });
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
