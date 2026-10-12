/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  DECISION_TREE_DIRECTORY,
  SYSTEM_LEARNING_CATEGORIES,
  TOOL_LEARNING_CATEGORIES,
  symptomFilePath,
  type LearningRecord,
} from '@kbn/nightshift-decision-trees';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import type { DecisionTreeStore } from './store';
import type { DecisionTreeSummary } from '../../common/decision_trees';

export const DECISION_TREE_WORKSPACE_ROOT = `/workspace/${DECISION_TREE_DIRECTORY}`;

/** Filename of the index that lists every decision tree, one row per symptom. */
export const MONITORS_INDEX_FILENAME = 'monitors.md';

/** Workspace-relative path of the index file, used in prompts and tool descriptions. */
export const MONITORS_INDEX_PATH = `${DECISION_TREE_DIRECTORY}/${MONITORS_INDEX_FILENAME}`;

/** Absolute sandbox path for a tree, from its `symptom:<slug>` id. */
export const workspacePathForTree = (treeId: string): string =>
  `/workspace/${symptomFilePath(treeId)}`;

/** The tree's markdown filename, relative to the index file (both live in the same directory). */
const treeFilename = (treeId: string): string => symptomFilePath(treeId).split('/').pop() ?? '';

/** Heading that fences off the appended learnings, so re-hydration can strip and re-render it. */
const REINFORCED_LEARNINGS_HEADING = '## Reinforced Learnings';

const UNCATEGORIZED_LABEL = 'uncategorized';
const UNSCOPED_CONNECTOR_LABEL = 'unspecified connector';

const pushInto = <T>(map: Map<string, T[]>, key: string, value: T): void => {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
  } else {
    map.set(key, [value]);
  }
};

/** Known categories first, in taxonomy order, then any unrecognized ones alphabetically. */
const orderCategories = (present: Iterable<string>, taxonomy: readonly string[]): string[] => {
  const set = new Set(present);
  const known = taxonomy.filter((category) => set.has(category));
  const unknown = [...set].filter((category) => !taxonomy.includes(category)).sort();
  return [...known, ...unknown];
};

const bulletList = (learnings: LearningRecord[]): string =>
  learnings.map((learning) => `- ${learning.content}`).join('\n');

/**
 * Renders a tree's learnings as a `## Reinforced Learnings` markdown section, bucketed the way the
 * reinforcement agent records them: system learnings by category, tool learnings by connector then
 * category, remediations flat. Returns '' when the tree has no learnings, so callers can append it
 * unconditionally.
 */
export const renderLearningsSection = (learnings: LearningRecord[]): string => {
  if (learnings.length === 0) {
    return '';
  }

  const system = new Map<string, LearningRecord[]>();
  const tools = new Map<string, Map<string, LearningRecord[]>>();
  const remediations: LearningRecord[] = [];
  const others: LearningRecord[] = [];

  for (const learning of learnings) {
    if (learning.kind === 'system') {
      pushInto(system, learning.category ?? UNCATEGORIZED_LABEL, learning);
    } else if (learning.kind === 'tool') {
      const connector = learning.connector_name ?? UNSCOPED_CONNECTOR_LABEL;
      const byConnector = tools.get(connector) ?? new Map<string, LearningRecord[]>();
      tools.set(connector, byConnector);
      pushInto(byConnector, learning.category ?? UNCATEGORIZED_LABEL, learning);
    } else if (learning.kind === 'remediation') {
      remediations.push(learning);
    } else {
      others.push(learning);
    }
  }

  const sections: string[] = [];

  if (system.size > 0) {
    const lines = ['### System Learnings'];
    for (const category of orderCategories(system.keys(), SYSTEM_LEARNING_CATEGORIES)) {
      lines.push('', `**${category}**`, '', bulletList(system.get(category) ?? []));
    }
    sections.push(lines.join('\n'));
  }

  if (tools.size > 0) {
    const lines = ['### Tool Learnings'];
    for (const connector of [...tools.keys()].sort()) {
      lines.push('', `#### ${connector}`);
      const byCategory = tools.get(connector) ?? new Map<string, LearningRecord[]>();
      for (const category of orderCategories(byCategory.keys(), TOOL_LEARNING_CATEGORIES)) {
        lines.push('', `**${category}**`, '', bulletList(byCategory.get(category) ?? []));
      }
    }
    sections.push(lines.join('\n'));
  }

  if (remediations.length > 0) {
    sections.push(`### Remediations\n\n${bulletList(remediations)}`);
  }

  if (others.length > 0) {
    sections.push(`### Other\n\n${bulletList(others)}`);
  }

  return (
    `${REINFORCED_LEARNINGS_HEADING}\n\n` +
    '_Distilled from past human feedback on prior investigations of this tree._\n\n' +
    `${sections.join('\n\n')}\n`
  );
};

/** Drops a previously appended learnings section so re-hydration never stacks duplicates. */
const stripLearningsSection = (markdown: string): string => {
  const index = markdown.indexOf(REINFORCED_LEARNINGS_HEADING);
  return index === -1 ? markdown : markdown.slice(0, index);
};

/**
 * Composes the per-tree workspace file: the agent-authored tree markdown followed by its learnings.
 * A prior learnings section is stripped before the current one is appended, so the file stays
 * stable across the read → edit → resubmit → re-hydrate round trip.
 */
export const buildTreeFileContent = (markdown: string, learnings: LearningRecord[]): string => {
  const base = stripLearningsSection(markdown).trimEnd();
  const learningsSection = renderLearningsSection(learnings);
  return learningsSection ? `${base}\n\n${learningsSection}` : `${base}\n`;
};

/**
 * Renders `monitors.md`: a `| Filename | Symptom |` table the agent scans at the start of an
 * investigation to find a prior tree for the symptom it is looking at, then opens by filename.
 */
const renderIndex = (trees: DecisionTreeSummary[]): string => {
  const lines = [
    '# Decision trees',
    '',
    "Each row maps a symptom to the file holding that symptom's investigation decision tree, a",
    'Mermaid flowchart. Open one with `nightshift_sandbox_view_file`.',
    '',
  ];

  if (trees.length === 0) {
    lines.push("_No decision trees yet. Create one for this investigation's symptom._");
    lines.push('');
    return lines.join('\n');
  }

  lines.push('| Filename | Symptom |', '| --- | --- |');
  for (const tree of trees) {
    lines.push(`| \`${treeFilename(tree.tree_id)}\` | ${tree.symptom} |`);
  }
  lines.push('');
  return lines.join('\n');
};

/**
 * Writes the stored decision trees into the agent's sandbox as plain markdown files, so the
 * model reads and edits them with its ordinary file tools.
 *
 * Returns the tree ids that were materialized; an empty result is what tells the turn-script
 * selector this is a create rather than a merge.
 */
export const materializeDecisionTrees = async ({
  session,
  store,
  logger,
  treeIds,
  signal,
}: {
  session: SandboxSession;
  store: DecisionTreeStore;
  logger: Logger;
  /**
   * When set, only these trees are written (reinforcement: trees the investigator opened).
   * Omitted for the investigator hydrate so it can discover any matching tree via monitors.md.
   */
  treeIds?: string[];
  signal?: AbortSignal;
}): Promise<DecisionTreeSummary[]> => {
  const allTrees = await store.list();
  // Archived means a tree was retired as wrong or obsolete, so re-hydrating it would invite the
  // agent to keep building on something we already decided not to trust.
  const allowed = treeIds ? new Set(treeIds) : undefined;
  const trees = allTrees.filter((tree) => {
    if (tree.status === 'archived') {
      return false;
    }
    return allowed ? allowed.has(tree.tree_id) : true;
  });

  const stored = (await Promise.all(trees.map(async (tree) => store.get(tree.tree_id)))).filter(
    (tree): tree is NonNullable<typeof tree> => tree !== undefined
  );

  if (signal?.aborted) {
    throw new Error('Decision tree hydrate aborted');
  }

  await session.mkdirs([DECISION_TREE_WORKSPACE_ROOT]);
  await session.writeFiles([
    {
      path: `${DECISION_TREE_WORKSPACE_ROOT}/${MONITORS_INDEX_FILENAME}`,
      content: Buffer.from(renderIndex(trees), 'utf8'),
    },
    ...stored.map((tree) => ({
      path: workspacePathForTree(tree.tree_id),
      content: Buffer.from(buildTreeFileContent(tree.markdown, tree.learnings), 'utf8'),
    })),
  ]);

  logger.info(`Materialized ${stored.length} decision tree(s) into sandbox`);
  return trees;
};
