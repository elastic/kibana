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
import type {
  DecisionTreeDetail,
  DecisionTreeStore,
  StoredTreeCounts,
} from '../../decision_trees/store';
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

const edgeRefSchema = lazySchema(() =>
  z.object({
    source_node_id: nodeIdSchema.describe('Mermaid id of the node the edge starts at, e.g. D1.'),
    target_node_id: nodeIdSchema.describe('Mermaid id of the node the edge ends at, e.g. E3.'),
    condition: z
      .string()
      .max(MAX_CONDITION_LENGTH)
      .optional()
      .describe('The edge label. Only needed when several edges join the same two nodes.'),
  })
);

const pathSchema = lazySchema(() => z.array(edgeRefSchema).max(MAX_PATH_EDGES));

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
        'Every edge this investigation followed, as node ids in the tree you are submitting (after your edits, if any).'
      ),
    causal_path: pathSchema
      .default([])
      .describe(
        'Only when the root cause was verified: the edges from the symptom to the confirmed end node. Each of them must carry ✅ in the tree. Leave empty otherwise.'
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
        'One entry per decision tree this investigation followed, whether or not you edited it, recording which edges it took.'
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
}

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
  logger: Logger;
}): BuiltinToolDefinition<typeof submitSchema> => {
  // Trees whose traversal a conversation already recorded, kept until a submit fully succeeds,
  // so resubmitting after a partial rejection does not count the same visits twice.
  const recordedTraversals = new Map<string, Set<string>>();

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
      // Peek until every submission is accepted. Draining first would drop this turn's learnings
      // when the agent has to fix a rejected file and call submit again.
      const turnLearnings = peekLearnings?.(conversationId) ?? [];
      const outcomes: SubmissionOutcome[] = [];

      const now = new Date().toISOString();
      const learningsFor = (treeId: string): LearningRecord[] =>
        turnLearnings.filter(
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
      const recorded = recordedTraversals.get(conversationId) ?? new Set<string>();
      const isRecorded = (treeId: string): boolean => recorded.has(symptomSlugFromTreeId(treeId));

      if (params.symptom_trees.length === 0 && params.traversals.length === 0) {
        const attached = await persistLearningsWithoutEdits({
          store,
          author,
          summary: params.summary,
          learnings: turnLearnings,
        });
        drainLearnings?.(conversationId);
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

      const work: Array<{
        treeId: string;
        filePath: string;
        persist: () => Promise<SubmissionOutcome>;
      }> = [
        ...params.symptom_trees.map((submission) => ({
          treeId: submission.tree_id,
          filePath: submission.file_path,
          persist: () =>
            persistSubmission({
              submission,
              traversal: traversals.get(symptomSlugFromTreeId(submission.tree_id)),
              countTraversal: !isRecorded(submission.tree_id),
              session,
              store,
              author,
              summary: params.summary,
              learnings: learningsFor(submission.tree_id),
              now,
            }),
        })),
        ...params.traversals
          .filter((traversal) => !editedSlugs.has(symptomSlugFromTreeId(traversal.tree_id)))
          .map((traversal) => ({
            treeId: traversal.tree_id,
            filePath: '',
            persist: () =>
              persistTraversal({
                traversal,
                countTraversal: !isRecorded(traversal.tree_id),
                store,
                author,
                summary: params.summary,
                learnings: learningsFor(traversal.tree_id),
                now,
              }),
          })),
      ];

      if (traversals.size < params.traversals.length) {
        outcomes.push({
          tree_id: params.traversals.map((traversal) => traversal.tree_id).join(', '),
          file_path: '',
          status: 'rejected',
          detail:
            'Submit at most one traversal per tree; combine its visited edges into one entry.',
        });
      } else {
        for (const { treeId, filePath, persist } of work) {
          try {
            outcomes.push(await persist());
            recorded.add(symptomSlugFromTreeId(treeId));
          } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            logger.warn(`Rejected decision-tree submission ${treeId}: ${detail}`);
            outcomes.push({ tree_id: treeId, file_path: filePath, status: 'rejected', detail });
          }
        }
      }

      const rejected = outcomes.filter((outcome) => outcome.status === 'rejected');
      const persisted = outcomes.filter((outcome) => outcome.status === 'persisted');
      if (rejected.length === 0) {
        recordedTraversals.delete(conversationId);
      } else {
        recordedTraversals.set(conversationId, recorded);
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

/** Records a traversal on `counts`: a visit along `visited_path`, then reinforcement along `causal_path`. */
const applyTraversal = (
  tree: DecisionTreeView,
  counts: DecisionTreeCounts,
  { visited_path: visitedPath, causal_path: causalPath }: Traversal,
  now: string
): DecisionTreeCounts => {
  const visited =
    visitedPath.length > 0 ? recordVisit({ tree, counts, path: visitedPath, now }) : counts;
  return causalPath.length > 0
    ? reinforcePath({ tree, counts: visited, path: causalPath, now })
    : visited;
};

/** The causal path must be the ✅ path in the file, so the tree and its counts tell one story. */
const assertCausalPathMarked = (tree: DecisionTreeView, { causal_path: causalPath }: Traversal) => {
  const unmarked = resolveEdgeRefs(tree, causalPath).filter((edge) => !edge.is_taken);
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
    now,
  }: {
    nextTree: DecisionTreeView;
    merges?: DecisionNodeMerge[];
    traversal?: Traversal;
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
    return traversal ? applyTraversal(nextTree, carried, traversal, now) : carried;
  };

const storedCountsOf = (existing: DecisionTreeDetail): StoredTreeCounts => ({
  tree: parseStoredDecisionTree(
    existing.mermaid,
    existing.tree_id,
    existing.evidence_gatherer_metadata
  ),
  counts: existing.counts,
});

const persistSubmission = async ({
  submission,
  traversal,
  countTraversal,
  session,
  store,
  author,
  summary,
  learnings,
  now,
}: {
  submission: z.infer<typeof submissionSchema>;
  traversal?: Traversal;
  /** False when this conversation already recorded the traversal and is only resubmitting. */
  countTraversal: boolean;
  session: SandboxSession;
  store: DecisionTreeStore;
  author: string;
  summary: string;
  learnings: LearningRecord[];
  now: string;
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
  const updateCounts = countsUpdateFor({
    nextTree: newTree,
    merges,
    traversal: countTraversal ? traversal : undefined,
    now,
  });
  // Dry run against what was read, so bad paths or merges are reported before anything is written.
  updateCounts(existing ? storedCountsOf(existing) : undefined);

  // A traversal names the confirmed causal path outright. Without one, fall back to the old signal
  // until the turn prompts ask for traversals: a taken edge an existing tree did not have.
  const reinforced = traversal
    ? traversal.causal_path.length > 0
    : hasNewlyTakenEdges(existing, newTree);
  await store.commit({
    treeId,
    markdown,
    tree: newTree,
    reinforced,
    author,
    summary,
    learnings,
    evidenceGathererMetadata: metadata,
    updateCounts,
  });

  return {
    tree_id: treeId,
    file_path: filePath,
    status: 'persisted',
    detail: [
      `${newTree.nodes.length} nodes, ${newTree.edges.length} edges`,
      ...traversalDetail(traversal),
      ...(reinforced && !traversal ? ['causal path marked'] : []),
    ].join(', '),
  };
};

const traversalDetail = (traversal: Traversal | undefined): string[] => [
  ...(traversal?.visited_path.length ? [`${traversal.visited_path.length} edges visited`] : []),
  ...(traversal?.causal_path.length ? ['causal path reinforced'] : []),
];

/** Records a traversal of a tree the agent did not edit: counts only, plus any learnings. */
const persistTraversal = async ({
  traversal,
  countTraversal,
  store,
  author,
  summary,
  learnings,
  now,
}: {
  traversal: Traversal;
  countTraversal: boolean;
  store: DecisionTreeStore;
  author: string;
  summary: string;
  learnings: LearningRecord[];
  now: string;
}): Promise<SubmissionOutcome> => {
  const { tree_id: treeId } = traversal;
  if (!countTraversal) {
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

  const stored = storedCountsOf(existing);
  assertCausalPathMarked(stored.tree, traversal);
  applyTraversal(stored.tree, stored.counts, traversal, now);
  const reinforced = traversal.causal_path.length > 0;

  // Learnings still get their own version; a traversal alone only moves the head's counts.
  if (learnings.length > 0) {
    await store.commit({
      treeId,
      markdown: existing.markdown,
      tree: stored.tree,
      reinforced,
      author,
      summary,
      learnings,
      evidenceGathererMetadata: existing.evidence_gatherer_metadata,
      updateCounts: countsUpdateFor({ nextTree: stored.tree, traversal, now }),
    });
  } else {
    await store.updateCounts({
      treeId,
      reinforced,
      update: ({ tree, counts }) => applyTraversal(tree, counts, traversal, now),
    });
  }

  return {
    tree_id: treeId,
    file_path: '',
    status: 'persisted',
    detail: ['no structural edits', ...traversalDetail(traversal)].join(', '),
  };
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

/** Commits this turn's learnings onto existing trees when the agent made no file edits. */
const persistLearningsWithoutEdits = async ({
  store,
  author,
  summary,
  learnings,
}: {
  store: DecisionTreeStore;
  author: string;
  summary: string;
  learnings: LearningRecord[];
}): Promise<string[]> => {
  const byTree = new Map<string, LearningRecord[]>();
  for (const learning of learnings) {
    if (!learning.tree_id) {
      continue;
    }
    const existing = byTree.get(learning.tree_id) ?? [];
    existing.push(learning);
    byTree.set(learning.tree_id, existing);
  }

  const attached: string[] = [];
  for (const [treeId, treeLearnings] of byTree) {
    const existing = await store.get(treeId);
    if (!existing) {
      continue;
    }
    const tree = parseStoredDecisionTree(
      existing.mermaid,
      treeId,
      existing.evidence_gatherer_metadata
    );
    await store.commit({
      treeId,
      markdown: existing.markdown,
      tree,
      reinforced: false,
      author,
      summary,
      learnings: treeLearnings,
      evidenceGathererMetadata: existing.evidence_gatherer_metadata,
      updateCounts: countsUpdateFor({ nextTree: tree, now: new Date().toISOString() }),
    });
    attached.push(treeId);
  }
  return attached;
};
