/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import {
  DECISION_TREE_DIRECTORY,
  DecisionTreeValidationError,
  applyEvidenceMetadata,
  carryCounts,
  countsForTree,
  decisionEdgeKey,
  edgesFromWalk,
  enforceMinimumGraph,
  enforceNodePreservation,
  enforceParsedSizeFloor,
  enforceRawSizeFloor,
  extractMermaid,
  isSymptomTreeId,
  parseMermaidDecisionTree,
  parseStoredDecisionTree,
  recordVisit,
  reinforcePath,
  resolveEdgeRefs,
  symptomFilePath,
  symptomSlugError,
  symptomSlugFromTreeId,
  validateEvidenceMetadata,
} from '@kbn/nightshift-decision-trees';
import type {
  DecisionNodeMerge,
  DecisionTreeCounts,
  DecisionTreeView,
  LearningRecord,
} from '@kbn/nightshift-decision-trees';
import type { SandboxPluginStart, SandboxSession } from '@kbn/sandbox-plugin/server';
import {
  DecisionTreeVersionWriteError,
  type DecisionTreeDetail,
  type DecisionTreeStore,
  type PendingVersionWrite,
  type StoredTreeCounts,
} from '../../decision_trees/store';
import type { AppliedWriteRecord, WriteProvenance } from '../../investigation_round';
import {
  getConversationId,
  getScopedConversationId,
  resolveAbsolutePath,
} from '../sandbox_bash/tool_utils';

export const DECISION_TREE_SUBMIT_TOOL_ID = 'nightshift_submit_optimizer_result';

const MAX_TREE_FILE_BYTES = 2 * 1024 * 1024;
const MAX_SUBMISSIONS = 10;
const MAX_NODE_ID_LENGTH = 64;
const MAX_CONDITION_LENGTH = 1024;
const MAX_PATH_EDGES = 200;
const MAX_MERGES = 50;

const treeIdSchema = lazySchema(() =>
  z
    .string()
    .max(256)
    .describe(
      'Identifier of the tree, formatted as symptom:<slug>. For an existing tree, use symptom:<symptom> with the symptom from the decision-trees/monitors.md table; for a new tree use the symptom slug you chose.'
    )
);

const nodeIdSchema = lazySchema(() => z.string().max(MAX_NODE_ID_LENGTH));

const pathStepSchema = lazySchema(() =>
  z.union([
    nodeIdSchema.describe('Mermaid id of the next node, e.g. E2.'),
    z.object({
      id: nodeIdSchema.describe('Mermaid id of the next node.'),
      condition: z
        .string()
        .max(MAX_CONDITION_LENGTH)
        .optional()
        .describe(
          'Label of the edge from the previous node. Only when several edges join those two nodes.'
        ),
    }),
  ])
);

/** A path is the node ids in order. One entry per node, not per edge. */
const pathSchema = lazySchema(() => z.array(pathStepSchema).max(MAX_PATH_EDGES + 1));

const nodeMergeSchema = lazySchema(() =>
  z.object({
    from: z
      .array(nodeIdSchema)
      .min(1)
      .max(MAX_MERGES)
      .describe('Ids of nodes from the existing tree that you folded into `into` and removed.'),
    into: nodeIdSchema.describe('Id of the node in your edited tree that absorbed them.'),
  })
);

const submissionSchema = lazySchema(() =>
  z.object({
    tree_id: treeIdSchema,
    file_path: z
      .string()
      .max(4096)
      .describe(`Path to the edited markdown file under ${DECISION_TREE_DIRECTORY}/.`),
    evidence_gatherer_metadata: z
      .array(z.string().max(4096))
      .max(200)
      .default([])
      .describe(
        "One entry per evidence_gatherer node, formatted '<node_id>: <description>'. Describe the toolset used, what data it gathers and from which sources, preserving exact query entities such as index patterns, field names, metric names, service names and filters."
      ),
    merged_nodes: z
      .array(nodeMergeSchema)
      .max(MAX_MERGES)
      .default([])
      .describe(
        'Existing nodes you collapsed into another node, so their visit and reinforcement history moves with them. Leave empty when you merged nothing.'
      ),
  })
);

const traversalSchema = lazySchema(() =>
  z.object({
    tree_id: treeIdSchema,
    visited_path: pathSchema
      .default([])
      .describe(
        'Node ids this investigation followed, in order, on the tree you are submitting (after your edits). Example: ["S1","E1","D1",{"id":"E2","condition":"yes"},"X1"]. Use an object only when several edges join the previous node to this one.'
      ),
    causal_path: pathSchema
      .default([])
      .describe(
        'Only when the root cause was verified: the same node-id walk from the symptom to the confirmed end. Each edge on it must carry ✅. Leave empty otherwise.'
      ),
  })
);

const submitSchema = lazySchema(() =>
  z.object({
    symptom_trees: z
      .array(submissionSchema)
      .max(MAX_SUBMISSIONS)
      .default([])
      .describe(
        'The decision-tree files you edited or created this turn. Submit an empty list when the existing tree already covers this investigation.'
      ),
    traversals: z
      .array(traversalSchema)
      .max(MAX_SUBMISSIONS)
      .default([])
      .describe(
        'One entry per decision tree this investigation followed, whether or not you edited it. Name the nodes in order, not each edge.'
      ),
    summary: z
      .string()
      .max(4096)
      .default('')
      .describe(
        'One or two sentences describing what changed in the tree, or why nothing changed.'
      ),
  })
);

interface SubmissionOutcome {
  tree_id: string;
  file_path: string;
  status: 'persisted' | 'rejected';
  detail: string;
  /** A file edit, including its merges, was written on this attempt. */
  countedEdit?: boolean;
  /** A visit this conversation had not counted yet was written on this attempt. */
  countedVisit?: boolean;
  /** A reinforcement this conversation had not counted yet was written on this attempt. */
  countedReinforcement?: boolean;
  /** Learnings written to the head on this attempt, even when the version write then failed. */
  persistedLearnings?: LearningRecord[];
  /** The version document still owed by a commit whose head was saved. */
  pendingVersion?: PendingVersionWrite;
  /** This attempt created the tree, so no later attempt of the turn may promote it. */
  createdTree?: boolean;
}

/** Which parts of a traversal this conversation has not counted yet. */
interface TraversalCounting {
  visit: boolean;
  reinforce: boolean;
}

/** What a conversation already wrote, kept until a submit fully succeeds. */
interface RetryState {
  /** When the state was last written, in epoch milliseconds. */
  updatedAt: number;
  /** Tree slugs whose file edit, including merges, reached the head. */
  edits: Set<string>;
  /** Tree slugs whose visit was counted. */
  visits: Set<string>;
  /** Tree slugs whose causal-path reinforcement was counted. */
  reinforcements: Set<string>;
  /** {@link learningRetryKey} of the learning last written to a head, by {@link learningSlotKey}. */
  persistedLearnings: Map<string, string>;
  /** Version documents owed by heads that were saved, by tree slug. */
  pendingVersions: Map<string, PendingVersionWrite>;
  /** Tree slugs an earlier attempt created; they stay tentative for the rest of the turn. */
  created: Set<string>;
}

/** A conversation that has not retried for this long is not coming back. */
const RETRY_STATE_TTL_MS = 60 * 60 * 1000;
const MAX_RETRY_STATES = 500;

const freshRetryState = (): RetryState => ({
  updatedAt: Date.now(),
  edits: new Set(),
  visits: new Set(),
  reinforcements: new Set(),
  persistedLearnings: new Map(),
  pendingVersions: new Map(),
  created: new Set(),
});

const provenanceFieldsOf = (
  provenance?: WriteProvenance
): { conversationId?: string; roundId?: string; workflowExecutionId?: string } => ({
  ...(provenance?.conversationId ? { conversationId: provenance.conversationId } : {}),
  ...(provenance?.roundId ? { roundId: provenance.roundId } : {}),
  ...(provenance?.workflowExecutionId
    ? { workflowExecutionId: provenance.workflowExecutionId }
    : {}),
});

/** The store keeps one learning per tree, kind, category and connector; the newest replaces it. */
const learningSlotKey = ({
  tree_id: treeId = '',
  kind,
  category,
  connector_name: connectorName,
}: LearningRecord): string =>
  JSON.stringify([symptomSlugFromTreeId(treeId), kind, category ?? '', connectorName ?? '']);

/** Identifies one learning across attempts, so a retry does not write it to its tree again. */
const learningRetryKey = (learning: LearningRecord): string =>
  JSON.stringify([learningSlotKey(learning), learning.content]);

/** The last learning recorded in each slot, since an earlier one in that slot would be replaced. */
const latestLearningPerSlot = (learnings: readonly LearningRecord[]): LearningRecord[] => {
  const bySlot = new Map<string, LearningRecord>();
  for (const learning of learnings) {
    bySlot.set(learningSlotKey(learning), learning);
  }
  return [...bySlot.values()];
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Terminal tool for the reinforcement agent.
 *
 * Reads each submitted file back out of the sandbox rather than trusting an inline copy, then runs
 * every guardrail before persisting. A rejected tree is reported back with the reason so the agent
 * can repair it, while the trees that passed are still written.
 */
export const createSubmitOptimizerResultTool = ({
  getSandboxStart,
  getStore,
  getSpaceId,
  getUsername,
  peekLearnings,
  drainLearnings,
  getProvenance,
  onAppliedWrite,
  logger,
}: {
  getSandboxStart: () => SandboxPluginStart | undefined;
  getStore: (esClient: ElasticsearchClient, request: KibanaRequest) => DecisionTreeStore;
  getSpaceId: (request: KibanaRequest) => string;
  /** Resolves the authenticated user, recorded as the version author. */
  getUsername?: (request: KibanaRequest) => string | undefined;
  /** Reads the learnings this conversation recorded this turn without clearing them. */
  peekLearnings?: (conversationId: string) => LearningRecord[];
  /** Takes and clears the learnings this conversation recorded this turn. */
  drainLearnings?: (conversationId: string) => LearningRecord[];
  getProvenance?: (conversationId: string) => WriteProvenance | undefined;
  onAppliedWrite?: (conversationId: string, write: AppliedWriteRecord) => void;
  logger: Logger;
}): BuiltinToolDefinition<typeof submitSchema> => {
  // What each conversation already wrote, kept until a submit fully succeeds. Map order is recency:
  // every update deletes and re-inserts its entry, so the first key is the stalest.
  const retryStates = new Map<string, RetryState>();
  const pruneRetryStates = (nowMs: number) => {
    for (const [conversationId, { updatedAt }] of retryStates) {
      if (updatedAt < nowMs - RETRY_STATE_TTL_MS) {
        retryStates.delete(conversationId);
      }
    }
    while (retryStates.size > MAX_RETRY_STATES) {
      const [stalest] = retryStates.keys();
      retryStates.delete(stalest);
    }
  };

  return {
    id: DECISION_TREE_SUBMIT_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Finalize this reinforcement turn. Submits the decision-tree files you edited or created so they are validated and persisted. Call this exactly once, at the end of the turn, even when you made no changes — in that case pass an empty symptom_trees list.',
    tags: ['decision-tree'],
    schema: submitSchema,
    annotations: {
      title: 'Submit Optimizer Result',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    handler: async (params, context) => {
      const conversationId = getScopedConversationId(context, getSpaceId);
      const rawConversationId = getConversationId(context);
      if (!conversationId || !rawConversationId) {
        return {
          results: [
            { type: ToolResultType.error, data: { message: 'No conversation context available.' } },
          ],
        };
      }
      pruneRetryStates(Date.now());
      const state = retryStates.get(conversationId) ?? freshRetryState();

      const sandboxStart = getSandboxStart();
      if (!sandboxStart) {
        return {
          results: [{ type: ToolResultType.error, data: { message: 'Sandbox is not available.' } }],
        };
      }

      let session: SandboxSession;
      try {
        session = sandboxStart.getSession(context.request, rawConversationId);
      } catch (err) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: err instanceof Error ? err.message : 'Sandbox is not available.' },
            },
          ],
        };
      }

      const store = getStore(context.esClient.asCurrentUser, context.request);
      const author = getUsername?.(context.request) || 'system';
      const provenance = getProvenance?.(conversationId);
      const recordWrite = onAppliedWrite
        ? (write: AppliedWriteRecord) => onAppliedWrite(conversationId, write)
        : undefined;
      // Peek until every submission is accepted. Draining first would drop this turn's learnings
      // when the agent has to fix a rejected file and call submit again.
      // A slot is pending until the head holds the turn's latest learning for it: a retry that
      // recorded an earlier value again must still overwrite whatever was written in between.
      const turnLearnings = latestLearningPerSlot(
        (peekLearnings?.(conversationId) ?? []).filter((learning) => learning.tree_id !== undefined)
      );
      const pendingLearnings = turnLearnings.filter(
        (learning) =>
          state.persistedLearnings.get(learningSlotKey(learning)) !== learningRetryKey(learning)
      );
      const outcomes: SubmissionOutcome[] = [];
      const committedThisAttempt = new Set<string>();

      const now = new Date().toISOString();
      const learningsFor = (treeId: string): LearningRecord[] =>
        pendingLearnings.filter(
          (learning) =>
            learning.tree_id !== undefined &&
            symptomSlugFromTreeId(learning.tree_id) === symptomSlugFromTreeId(treeId)
        );
      const traversals = new Map(
        params.traversals.map((traversal) => [symptomSlugFromTreeId(traversal.tree_id), traversal])
      );
      const editedSlugs = new Set(
        params.symptom_trees.map((submission) => symptomSlugFromTreeId(submission.tree_id))
      );
      const editWasRecorded = (treeId: string): boolean =>
        state.edits.has(symptomSlugFromTreeId(treeId));
      const createdThisTurn = (treeId: string): boolean =>
        state.created.has(symptomSlugFromTreeId(treeId));
      const countingFor = (traversal?: Traversal): TraversalCounting => {
        if (!traversal) {
          return { visit: false, reinforce: false };
        }
        const slug = symptomSlugFromTreeId(traversal.tree_id);
        return {
          visit: traversal.visited_path.length > 0 && !state.visits.has(slug),
          reinforce: traversal.causal_path.length > 0 && !state.reinforcements.has(slug),
        };
      };

      // Record what reached the head even when the version document did not, so the retry does
      // not apply those counts or learnings again.
      const recordOutcome = (treeId: string, outcome: SubmissionOutcome) => {
        outcomes.push(outcome);
        const slug = symptomSlugFromTreeId(treeId);
        if (outcome.countedEdit) {
          state.edits.add(slug);
        }
        if (outcome.countedVisit) {
          state.visits.add(slug);
        }
        if (outcome.countedReinforcement) {
          state.reinforcements.add(slug);
        }
        for (const learning of outcome.persistedLearnings ?? []) {
          const key = learningRetryKey(learning);
          state.persistedLearnings.set(learningSlotKey(learning), key);
          committedThisAttempt.add(key);
        }
        if (outcome.pendingVersion) {
          state.pendingVersions.set(slug, outcome.pendingVersion);
        }
        if (outcome.createdTree) {
          state.created.add(slug);
        }
      };
      const runPersist = async (
        treeId: string,
        filePath: string,
        persist: () => Promise<SubmissionOutcome>
      ) => {
        try {
          recordOutcome(treeId, await persist());
        } catch (error) {
          const detail = errorMessage(error);
          logger.warn(`Rejected decision-tree submission ${treeId}: ${detail}`);
          outcomes.push({ tree_id: treeId, file_path: filePath, status: 'rejected', detail });
        }
      };

      // A head saved without its version document blocks further writes to that tree until the
      // version is written, so the version history has no gap.
      const blockedSlugs = new Set<string>();
      for (const [slug, pendingVersion] of state.pendingVersions) {
        try {
          await store.writePendingVersion(pendingVersion);
          state.pendingVersions.delete(slug);
        } catch (error) {
          const detail = errorMessage(error);
          logger.warn(`Rejected decision-tree submission ${pendingVersion.treeId}: ${detail}`);
          outcomes.push({
            tree_id: pendingVersion.treeId,
            file_path: '',
            status: 'rejected',
            detail,
          });
          blockedSlugs.add(slug);
        }
      }

      const work: Array<{
        treeId: string;
        filePath: string;
        persist: () => Promise<SubmissionOutcome>;
      }> = [
        ...params.symptom_trees.map((submission) => ({
          treeId: submission.tree_id,
          filePath: submission.file_path,
          persist: async () => {
            const traversal = traversals.get(symptomSlugFromTreeId(submission.tree_id));
            const counting = countingFor(traversal);
            const learnings = learningsFor(submission.tree_id);
            // The file and its merges are already on the head. Replaying them fails once the
            // merged-away node is gone. Skip that replay only when the file and its metadata are
            // unchanged; a retry that adds ✅ marks still has to be saved, or the new causal path
            // is checked against the old unmarked head and rejected forever.
            if (editWasRecorded(submission.tree_id)) {
              const existing = await store.get(submission.tree_id);
              const submitted = await readSubmittedMarkdown(session, submission.file_path);
              if (
                existing !== undefined &&
                submitted === existing.markdown &&
                sameStrings(
                  submission.evidence_gatherer_metadata,
                  existing.evidence_gatherer_metadata
                )
              ) {
                if (!traversal || (!counting.visit && !counting.reinforce)) {
                  return {
                    tree_id: submission.tree_id,
                    file_path: submission.file_path,
                    status: 'persisted' as const,
                    detail: 'edit already saved this turn',
                  };
                }
                return persistTraversal({
                  traversal,
                  counting,
                  createdThisTurn: createdThisTurn(submission.tree_id),
                  store,
                  author,
                  summary: params.summary,
                  learnings,
                  now,
                  provenance,
                  onAppliedWrite: recordWrite,
                });
              }
              return persistSubmission({
                submission: {
                  ...submission,
                  merged_nodes: remainingMerges(submission.merged_nodes, existing),
                },
                traversal,
                counting,
                createdThisTurn: createdThisTurn(submission.tree_id),
                session,
                store,
                author,
                summary: params.summary,
                learnings,
                now,
                provenance,
                onAppliedWrite: recordWrite,
              });
            }
            return persistSubmission({
              submission,
              traversal,
              counting,
              createdThisTurn: createdThisTurn(submission.tree_id),
              session,
              store,
              author,
              summary: params.summary,
              learnings,
              now,
              provenance,
              onAppliedWrite: recordWrite,
            });
          },
        })),
        ...params.traversals
          .filter((traversal) => !editedSlugs.has(symptomSlugFromTreeId(traversal.tree_id)))
          .map((traversal) => ({
            treeId: traversal.tree_id,
            filePath: '',
            persist: () =>
              persistTraversal({
                traversal,
                counting: countingFor(traversal),
                createdThisTurn: createdThisTurn(traversal.tree_id),
                store,
                author,
                summary: params.summary,
                learnings: learningsFor(traversal.tree_id),
                now,
                provenance,
                onAppliedWrite: recordWrite,
              }),
          })),
      ];

      // A tree listed twice would be committed twice in one turn, and the second entry's metadata
      // would replace the first's, so duplicates reject the whole submit before anything is written.
      const duplicateTrees = editedSlugs.size < params.symptom_trees.length;
      const duplicateTraversals = traversals.size < params.traversals.length;
      if (duplicateTrees || duplicateTraversals) {
        if (duplicateTrees) {
          outcomes.push({
            tree_id: params.symptom_trees.map((submission) => submission.tree_id).join(', '),
            file_path: '',
            status: 'rejected',
            detail:
              'Submit each tree once in symptom_trees; put all of its evidence_gatherer_metadata and merged_nodes in one entry.',
          });
        }
        if (duplicateTraversals) {
          outcomes.push({
            tree_id: params.traversals.map((traversal) => traversal.tree_id).join(', '),
            file_path: '',
            status: 'rejected',
            detail:
              'Submit at most one traversal per tree; combine its visited edges into one entry.',
          });
        }
      } else {
        for (const { treeId, filePath, persist } of work) {
          if (!blockedSlugs.has(symptomSlugFromTreeId(treeId))) {
            await runPersist(treeId, filePath, persist);
          }
        }

        // Learnings no edit or traversal carried get a commit of their own, except on a rejected
        // tree: they stay pending and go with its edit once the agent fixes it.
        const rejectedSlugs = new Set([
          ...blockedSlugs,
          ...outcomes
            .filter((outcome) => outcome.status === 'rejected')
            .map((outcome) => symptomSlugFromTreeId(outcome.tree_id)),
        ]);
        const learningsByTree = new Map<string, { treeId: string; learnings: LearningRecord[] }>();
        for (const learning of pendingLearnings) {
          if (!learning.tree_id || committedThisAttempt.has(learningRetryKey(learning))) {
            continue;
          }
          const slug = symptomSlugFromTreeId(learning.tree_id);
          if (rejectedSlugs.has(slug)) {
            continue;
          }
          const group = learningsByTree.get(slug) ?? { treeId: learning.tree_id, learnings: [] };
          group.learnings.push(learning);
          learningsByTree.set(slug, group);
        }
        for (const { treeId, learnings } of learningsByTree.values()) {
          await runPersist(treeId, '', () =>
            persistTreeLearnings({
              treeId,
              learnings,
              store,
              author,
              summary: params.summary,
              provenance,
              onAppliedWrite: recordWrite,
            })
          );
        }
      }

      const rejected = outcomes.filter((outcome) => outcome.status === 'rejected');
      const persisted = outcomes.filter((outcome) => outcome.status === 'persisted');
      retryStates.delete(conversationId);
      if (rejected.length > 0) {
        retryStates.set(conversationId, { ...state, updatedAt: Date.now() });
        pruneRetryStates(Date.now());
      }

      if (rejected.length === 0) {
        drainLearnings?.(conversationId);
      }

      if (rejected.length > 0) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: [
                  `${rejected.length} decision tree(s) were rejected and NOT saved. Fix the file and call this tool again.`,
                  ...rejected.map((outcome) => `- ${outcome.tree_id}: ${outcome.detail}`),
                  ...(persisted.length > 0
                    ? [`${persisted.length} other tree(s) were saved successfully.`]
                    : []),
                ].join('\n'),
              },
            },
          ],
        };
      }

      if (params.symptom_trees.length === 0 && params.traversals.length === 0) {
        const attached = persisted
          .filter((outcome) => outcome.detail === 'learnings attached')
          .map((outcome) => outcome.tree_id);
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                text:
                  attached.length === 0
                    ? 'No decision-tree changes submitted. Turn complete.'
                    : `No structural edits. Attached learnings to ${
                        attached.length
                      } tree(s):\n${attached.map((treeId) => `- ${treeId}`).join('\n')}`,
                summary: params.summary,
              },
            },
          ],
        };
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              text:
                persisted.length === 0
                  ? 'No decision-tree changes submitted. Turn complete.'
                  : `Persisted ${persisted.length} decision tree(s):\n${persisted
                      .map((outcome) => `- ${outcome.tree_id} (${outcome.detail})`)
                      .join('\n')}`,
              summary: params.summary,
            },
          },
        ],
      };
    },
  };
};

type Traversal = z.infer<typeof traversalSchema>;

/** Consecutive node ids are the edges. One id names nothing, so it is rejected before any write. */
const edgesOf = (steps: Traversal['visited_path'], treeId: string) => {
  if (steps.length === 1) {
    throw new DecisionTreeValidationError(
      treeId,
      'A path lists node ids in order and needs at least two.'
    );
  }
  return edgesFromWalk(steps);
};

/**
 * Records the parts of a traversal `counting` allows on `counts`: a visit along `visited_path`,
 * then reinforcement along `causal_path`. Both paths are validated either way.
 */
const applyTraversal = (
  tree: DecisionTreeView,
  counts: DecisionTreeCounts,
  { visited_path: visitedPath, causal_path: causalPath, tree_id: treeId }: Traversal,
  now: string,
  counting: TraversalCounting
): DecisionTreeCounts => {
  const visitedEdges = edgesOf(visitedPath, treeId);
  const causalEdges = edgesOf(causalPath, treeId);
  const visited =
    counting.visit && visitedEdges.length > 0
      ? recordVisit({ tree, counts, path: visitedEdges, now })
      : counts;
  return counting.reinforce && causalEdges.length > 0
    ? reinforcePath({ tree, counts: visited, path: causalEdges, now })
    : visited;
};

/** The causal path must be the ✅ path in the file, so the tree and its counts tell one story. */
const assertCausalPathMarked = (tree: DecisionTreeView, traversal: Traversal) => {
  const unmarked = resolveEdgeRefs(tree, edgesOf(traversal.causal_path, traversal.tree_id)).filter(
    (edge) => !edge.is_taken
  );
  if (unmarked.length > 0) {
    throw new DecisionTreeValidationError(
      tree.tree_id,
      `Mark every causal_path edge with ✅ in ${tree.tree_id}; unmarked: ${unmarked
        .map((edge) => `${edge.source_node_id} --> ${edge.target_node_id}`)
        .join(', ')}`
    );
  }
};

/** Builds the counts update for a commit of `nextTree`, carrying the stored counts across the edit. */
const countsUpdateFor =
  ({
    nextTree,
    merges = [],
    traversal,
    counting,
    now,
  }: {
    nextTree: DecisionTreeView;
    merges?: DecisionNodeMerge[];
    traversal?: Traversal;
    counting: TraversalCounting;
    now: string;
  }): ((previous: StoredTreeCounts | undefined) => DecisionTreeCounts) =>
  (previous) => {
    const carried = previous
      ? carryCounts({
          previousTree: previous.tree,
          previousCounts: previous.counts,
          nextTree,
          merges,
        })
      : countsForTree(nextTree);
    return traversal ? applyTraversal(nextTree, carried, traversal, now, counting) : carried;
  };

const storedCountsOf = (existing: DecisionTreeDetail): StoredTreeCounts => ({
  tree: parseStoredDecisionTree(
    existing.mermaid,
    existing.tree_id,
    existing.evidence_gatherer_metadata
  ),
  counts: existing.counts,
});

const sameStrings = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

/** The merges a saved edit has not applied yet: a `from` node still on the head was not merged away. */
const remainingMerges = (
  merges: DecisionNodeMerge[],
  existing: DecisionTreeDetail | undefined
): DecisionNodeMerge[] => {
  if (!existing) {
    return [];
  }
  const headNodeIds = new Set(storedCountsOf(existing).tree.nodes.map((node) => node.node_id));
  return merges
    .map((merge) => ({ ...merge, from: merge.from.filter((nodeId) => headNodeIds.has(nodeId)) }))
    .filter((merge) => merge.from.length > 0);
};

/**
 * A commit whose head was saved but whose version document was not: the head already took this
 * write, so it is reported as applied and rejected with the version still owed.
 */
const versionWriteRejection = (
  error: unknown,
  outcome: SubmissionOutcome,
  onHeadSaved: (head: DecisionTreeDetail) => void
): SubmissionOutcome => {
  if (!(error instanceof DecisionTreeVersionWriteError)) {
    throw error;
  }
  onHeadSaved(error.pending.head);
  return { ...outcome, status: 'rejected', detail: error.message, pendingVersion: error.pending };
};

/** The submitted file's text, or undefined when it cannot be read. Validation reports that later. */
const readSubmittedMarkdown = async (
  session: SandboxSession,
  filePath: string
): Promise<string | undefined> => {
  try {
    const [readResult] = await session.readFiles([
      { path: resolveAbsolutePath(filePath), maxReadBytes: MAX_TREE_FILE_BYTES },
    ]);
    if (!readResult?.success) return undefined;
    return readResult.content.toString('utf8');
  } catch {
    return undefined;
  }
};

const persistSubmission = async ({
  submission,
  traversal,
  counting,
  createdThisTurn,
  session,
  store,
  author,
  summary,
  learnings,
  now,
  provenance,
  onAppliedWrite,
}: {
  submission: z.infer<typeof submissionSchema>;
  traversal?: Traversal;
  /** Which parts of the traversal this conversation has not counted yet. */
  counting: TraversalCounting;
  /** An earlier attempt of this turn created the tree. */
  createdThisTurn: boolean;
  session: SandboxSession;
  store: DecisionTreeStore;
  author: string;
  summary: string;
  learnings: LearningRecord[];
  now: string;
  provenance?: WriteProvenance;
  onAppliedWrite?: (write: AppliedWriteRecord) => void;
}): Promise<SubmissionOutcome> => {
  const {
    tree_id: treeId,
    file_path: filePath,
    evidence_gatherer_metadata: metadata,
    merged_nodes: merges,
  } = submission;

  if (!isSymptomTreeId(treeId)) {
    throw new DecisionTreeValidationError(
      treeId,
      `tree_id must be formatted symptom:<slug>, got "${treeId}"`
    );
  }

  const slug = symptomSlugFromTreeId(treeId);
  const slugError = symptomSlugError(slug);
  if (slugError) {
    throw new DecisionTreeValidationError(treeId, slugError);
  }

  // Containment check: the agent may only write inside the decision-tree directory, and the file
  // name has to match the tree it claims to be, or a tree could be persisted from any file.
  const expectedPath = resolveAbsolutePath(symptomFilePath(slug));
  const resolvedPath = resolveAbsolutePath(filePath);
  if (resolvedPath !== expectedPath) {
    throw new DecisionTreeValidationError(
      treeId,
      `file_path for ${treeId} must be ${symptomFilePath(slug)}, got "${filePath}"`
    );
  }

  const [readResult] = await session.readFiles([
    { path: resolvedPath, maxReadBytes: MAX_TREE_FILE_BYTES },
  ]);
  if (!readResult?.success) {
    throw new DecisionTreeValidationError(treeId, `Could not read submitted file ${filePath}`);
  }

  const markdown = readResult.content.toString('utf8');
  const newMermaid = extractMermaid(markdown);
  const newTree = parseMermaidDecisionTree(newMermaid, treeId);
  if (newTree.nodes.length === 0) {
    throw new DecisionTreeValidationError(
      treeId,
      `No decision-tree nodes could be parsed from ${filePath}. Check the node shapes.`
    );
  }

  validateEvidenceMetadata(treeId, metadata);
  applyEvidenceMetadata(newTree, metadata);
  enforceMinimumGraph(newTree);

  const existing = await store.get(treeId);
  const originalMermaid = existing?.mermaid ?? '';
  enforceRawSizeFloor({ treeId, originalMermaid, newMermaid });
  enforceParsedSizeFloor({ treeId, originalMermaid, newTree });
  enforceNodePreservation({
    treeId,
    originalMermaid,
    newNodeIds: new Set(newTree.nodes.map((node) => node.node_id)),
  });

  if (!existing && merges.length > 0) {
    throw new DecisionTreeValidationError(
      treeId,
      `merged_nodes only applies to an existing tree; ${treeId} is new`
    );
  }
  if (traversal) {
    assertCausalPathMarked(newTree, traversal);
  }
  const updateCounts = countsUpdateFor({ nextTree: newTree, merges, traversal, counting, now });
  // Dry run against what was read, so bad paths or merges are reported before anything is written.
  updateCounts(existing ? storedCountsOf(existing) : undefined);

  // A traversal names the confirmed causal path outright. Without one, fall back to the old signal
  // until the turn prompts ask for traversals: a taken edge an existing tree did not have. Only an
  // existing tree is promoted; a tree created this turn, on this or an earlier attempt, starts
  // tentative either way.
  const reinforced =
    existing !== undefined &&
    !createdThisTurn &&
    (traversal ? traversal.causal_path.length > 0 : hasNewlyTakenEdges(existing, newTree));
  const outcome: SubmissionOutcome = {
    tree_id: treeId,
    file_path: filePath,
    status: 'persisted',
    countedEdit: true,
    createdTree: existing === undefined,
    countedVisit: counting.visit,
    countedReinforcement: counting.reinforce,
    persistedLearnings: learnings,
    detail: [
      `${newTree.nodes.length} nodes, ${newTree.edges.length} edges`,
      ...traversalDetail(traversal),
      ...(reinforced && !traversal ? ['causal path marked'] : []),
    ].join(', '),
  };
  const recordApplied = (head: DecisionTreeDetail | undefined, afterContent: string) =>
    onAppliedWrite?.({
      store: 'decision_tree',
      item_id: treeId,
      action: existing ? (reinforced ? 'reinforce' : 'update') : 'create',
      version: head?.version ?? (existing ? existing.version + 1 : 1),
      ...(existing ? { before_status: existing.status, before_content: existing.markdown } : {}),
      after_status: head?.status ?? (reinforced ? 'established' : existing?.status ?? 'tentative'),
      after_content: afterContent,
    });
  try {
    const committed = await store.commit({
      treeId,
      markdown,
      tree: newTree,
      reinforced,
      author,
      summary,
      learnings,
      evidenceGathererMetadata: metadata,
      updateCounts,
      ...provenanceFieldsOf(provenance),
    });
    recordApplied(committed, markdown);
  } catch (error) {
    // The head already has this edit. Reject the submit so the agent retries, and keep the
    // counted flags so that retry does not apply the edit or traversal again.
    return versionWriteRejection(error, outcome, (head) => recordApplied(head, head.markdown));
  }

  return outcome;
};

const traversalDetail = (traversal: Traversal | undefined): string[] => [
  ...(traversal && traversal.visited_path.length > 1
    ? [`${traversal.visited_path.length - 1} edges visited`]
    : []),
  ...(traversal?.causal_path.length ? ['causal path reinforced'] : []),
];

/** Records a traversal of a tree the agent did not edit: counts only, plus any learnings. */
const persistTraversal = async ({
  traversal,
  counting,
  createdThisTurn,
  store,
  author,
  summary,
  learnings,
  now,
  provenance,
  onAppliedWrite,
}: {
  traversal: Traversal;
  counting: TraversalCounting;
  /** An earlier attempt of this turn created the tree, so it is not promoted. */
  createdThisTurn: boolean;
  store: DecisionTreeStore;
  author: string;
  summary: string;
  learnings: LearningRecord[];
  now: string;
  provenance?: WriteProvenance;
  onAppliedWrite?: (write: AppliedWriteRecord) => void;
}): Promise<SubmissionOutcome> => {
  const { tree_id: treeId } = traversal;
  if (!counting.visit && !counting.reinforce) {
    return {
      tree_id: treeId,
      file_path: '',
      status: 'persisted',
      detail: 'traversal already recorded this turn',
    };
  }
  const existing = await store.get(treeId);
  if (!existing) {
    throw new DecisionTreeValidationError(
      treeId,
      `${treeId} does not exist; a traversal must name a stored tree or one you submit this turn`
    );
  }

  // Dry run against what was read, so a bad path is reported before anything is written. The
  // writes check again against the head they re-read, which may have changed since.
  const stored = storedCountsOf(existing);
  assertCausalPathMarked(stored.tree, traversal);
  applyTraversal(stored.tree, stored.counts, traversal, now, counting);
  const reinforced = !createdThisTurn && traversal.causal_path.length > 0;

  const outcome: SubmissionOutcome = {
    tree_id: treeId,
    file_path: '',
    status: 'persisted',
    countedVisit: counting.visit,
    countedReinforcement: counting.reinforce,
    persistedLearnings: learnings,
    detail: ['no structural edits', ...traversalDetail(traversal)].join(', '),
  };
  const recordApplied = (head: DecisionTreeDetail | undefined, fallbackVersion: number) =>
    onAppliedWrite?.({
      store: 'decision_tree',
      item_id: treeId,
      action: reinforced ? 'reinforce' : 'update',
      version: head?.version ?? fallbackVersion,
      before_status: existing.status,
      after_status: head?.status ?? (reinforced ? 'established' : existing.status),
      before_content: existing.markdown,
      after_content: head?.markdown ?? existing.markdown,
    });
  try {
    // Learnings still get their own version; a traversal alone only moves the head's counts.
    if (learnings.length > 0) {
      const committed = await store.commit({
        treeId,
        keepHeadContent: true,
        reinforced,
        author,
        summary,
        learnings,
        updateCounts: (previous) => {
          if (!previous) {
            throw new Error(`${treeId} no longer exists`);
          }
          assertCausalPathMarked(previous.tree, traversal);
          return applyTraversal(previous.tree, previous.counts, traversal, now, counting);
        },
        ...provenanceFieldsOf(provenance),
      });
      recordApplied(committed, existing.version + 1);
    } else {
      const updated = await store.updateCounts({
        treeId,
        reinforced,
        ...(provenance?.conversationId ? { conversationId: provenance.conversationId } : {}),
        update: ({ tree, counts }) => {
          assertCausalPathMarked(tree, traversal);
          return applyTraversal(tree, counts, traversal, now, counting);
        },
      });
      // The head can vanish after the read above, even mid-retry; then nothing was counted.
      if (!updated) {
        throw new DecisionTreeValidationError(treeId, `${treeId} no longer exists`);
      }
      recordApplied(updated, existing.version);
    }
  } catch (error) {
    return versionWriteRejection(error, outcome, (head) => recordApplied(head, head.version));
  }

  return outcome;
};

/** True when this edit introduces a taken edge the previous version did not have. */
const hasNewlyTakenEdges = (
  existing: DecisionTreeDetail | undefined,
  newTree: DecisionTreeView
): boolean => {
  if (!existing) {
    return false;
  }
  const original = parseStoredDecisionTree(
    existing.mermaid,
    existing.tree_id,
    existing.evidence_gatherer_metadata
  );
  const originalTaken = new Set(
    original.edges.filter((edge) => edge.is_taken).map(decisionEdgeKey)
  );
  return newTree.edges.some((edge) => edge.is_taken && !originalTaken.has(decisionEdgeKey(edge)));
};

/** Commits learnings onto a stored tree that this submit neither edited nor traversed. */
const persistTreeLearnings = async ({
  treeId,
  learnings,
  store,
  author,
  summary,
  provenance,
  onAppliedWrite,
}: {
  treeId: string;
  learnings: LearningRecord[];
  store: DecisionTreeStore;
  author: string;
  summary: string;
  provenance?: WriteProvenance;
  onAppliedWrite?: (write: AppliedWriteRecord) => void;
}): Promise<SubmissionOutcome> => {
  const existing = await store.get(treeId);
  if (!existing) {
    return {
      tree_id: treeId,
      file_path: '',
      status: 'persisted',
      detail: 'no stored tree for these learnings',
    };
  }

  const outcome: SubmissionOutcome = {
    tree_id: treeId,
    file_path: '',
    status: 'persisted',
    persistedLearnings: learnings,
    detail: 'learnings attached',
  };
  const recordApplied = (head: DecisionTreeDetail | undefined) =>
    onAppliedWrite?.({
      store: 'decision_tree',
      item_id: treeId,
      action: 'attach_learnings',
      version: head?.version ?? existing.version + 1,
      before_status: existing.status,
      after_status: head?.status ?? existing.status,
      before_content: existing.markdown,
      after_content: head?.markdown ?? existing.markdown,
    });
  try {
    const committed = await store.commit({
      treeId,
      keepHeadContent: true,
      reinforced: false,
      author,
      summary,
      learnings,
      updateCounts: (previous) => {
        if (!previous) {
          throw new Error(`${treeId} no longer exists`);
        }
        return previous.counts;
      },
      ...provenanceFieldsOf(provenance),
    });
    recordApplied(committed);
  } catch (error) {
    return versionWriteRejection(error, outcome, recordApplied);
  }

  return outcome;
};
