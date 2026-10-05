/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { symptomSlugFromTreeId, symptomTreeId } from '@kbn/nightshift-decision-trees';
import {
  DECISION_TREE_ATTACHMENT_TYPE,
  type DecisionTreeAttachmentData,
} from '../../../common/decision_trees';
import type { DecisionTreeStore } from '../../decision_trees/store';

export const ATTACH_DECISION_TREE_TOOL_ID = 'nightshift_attach_decision_tree';

/** `decision-trees/decision_tree_<slug>.md`, as the agent sees the file in the sandbox. */
const TREE_FILE_RE = /decision_tree_([a-z0-9-]+)\.md$/;

/** The tree id for what the agent passes: a tree id, a bare slug, or the tree's file path. */
export const toTreeId = (value: string): string => {
  const trimmed = value.trim();
  const fromFile = trimmed.match(TREE_FILE_RE)?.[1];
  return symptomTreeId(fromFile ?? symptomSlugFromTreeId(trimmed));
};

/** One attachment per tree and conversation, so attaching a tree again updates it. */
export const decisionTreeAttachmentId = (treeId: string): string =>
  `nightshift-decision-tree-${symptomSlugFromTreeId(treeId)}`;

export const REMOVED_DECISION_TREE_NOTE =
  'The user removed this decision tree from the conversation, so it was not attached again.';

const schema = z.object({
  tree: z
    .string()
    .min(1)
    .max(512)
    .describe(
      'The decision tree you followed: its file path (for example "/workspace/decision-trees/decision_tree_checkout-latency.md"), its slug, or its tree id ("symptom:checkout-latency").'
    ),
});

const DESCRIPTION =
  'Attach a decision tree from /workspace/decision-trees/ to the investigation, with the version you read, so readers see which prior tree guided it. ' +
  'Call it once for each tree whose symptom matched and that you followed, right after you read it. Attaching the same tree again updates it.';

/** `nightshift_attach_decision_tree`: attaches a stored decision tree to the conversation. */
export const createAttachDecisionTreeTool = ({
  getStore,
  logger,
}: {
  getStore: (esClient: ElasticsearchClient, request: KibanaRequest) => DecisionTreeStore;
  logger: Logger;
}): BuiltinToolDefinition<typeof schema> => ({
  id: ATTACH_DECISION_TREE_TOOL_ID,
  type: ToolType.builtin,
  description: DESCRIPTION,
  tags: ['decision-tree', 'investigation'],
  schema,
  annotations: {
    title: 'Attach Decision Tree',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ tree }, { esClient, request, attachments }) => {
    const treeId = toTreeId(tree);
    try {
      const detail = await getStore(esClient.asCurrentUser, request).get(treeId);
      if (!detail) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `No decision tree "${treeId}" is stored.` },
            },
          ],
        };
      }
      const data: DecisionTreeAttachmentData = {
        tree_id: detail.tree_id,
        symptom: detail.symptom,
        title: detail.title,
        version: detail.version,
        markdown: detail.markdown,
      };
      const id = decisionTreeAttachmentId(detail.tree_id);
      const description = `Decision tree: ${detail.title}`;
      const record = attachments.getAttachmentRecord(id);
      if (record?.active === false) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: { acknowledged: true, attachment_id: id, warning: REMOVED_DECISION_TREE_NOTE },
            },
          ],
        };
      }
      if (record) {
        await attachments.update(id, { data, description }, ATTACHMENT_REF_ACTOR.agent, {
          request,
        });
      } else {
        await attachments.add(
          { id, type: DECISION_TREE_ATTACHMENT_TYPE, data, description },
          ATTACHMENT_REF_ACTOR.agent,
          undefined,
          { request }
        );
      }
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              acknowledged: true,
              attachment_id: id,
              tree_id: detail.tree_id,
              version: detail.version,
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.debug(`Could not attach decision tree ${treeId}: ${message}`);
      return { results: [{ type: ToolResultType.error, data: { message } }] };
    }
  },
});
