/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  DECISION_TREE_ATTACHMENT_TYPE,
  type DecisionTreeAttachmentData,
} from '../../common/decision_trees';

const MAX_ID_LENGTH = 256;
const MAX_TITLE_LENGTH = 512;
/** Generous: a tree file is a Mermaid flowchart plus its reinforced learnings. */
const MAX_MARKDOWN_LENGTH = 200_000;

export const decisionTreeAttachmentDataSchema = z.object({
  tree_id: z.string().min(1).max(MAX_ID_LENGTH),
  symptom: z.string().min(1).max(MAX_ID_LENGTH),
  title: z.string().max(MAX_TITLE_LENGTH),
  version: z.number().int().min(0),
  markdown: z.string().max(MAX_MARKDOWN_LENGTH),
});

/** Text the LLM sees: which tree and version, then the raw tree file. */
export const formatDecisionTreeForAgent = ({
  tree_id: treeId,
  title,
  version,
  markdown,
}: DecisionTreeAttachmentData): string =>
  [`## Decision tree "${title}" (${treeId}, version ${version})`, markdown].join('\n\n');

/**
 * `nightshift.decision_tree`: a decision tree an investigation followed, attached by value with
 * the raw markdown of the version it read. The investigation flyout links each one to the tree in
 * the Nightshift management app.
 */
export const decisionTreeAttachmentType: AttachmentTypeDefinition<
  typeof DECISION_TREE_ATTACHMENT_TYPE,
  DecisionTreeAttachmentData
> = {
  id: DECISION_TREE_ATTACHMENT_TYPE,
  isReadonly: true,
  validate: (input) => {
    const result = decisionTreeAttachmentDataSchema.safeParse(input);
    return result.success
      ? { valid: true, data: result.data }
      : { valid: false, error: result.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => ({ type: 'text', value: formatDecisionTreeForAgent(attachment.data) }),
  }),
  getAgentDescription: () =>
    'A decision tree attachment is a prior Nightshift decision tree the investigation followed, with the raw markdown of the version it read. ' +
    'Treat it as a lead to confirm against current telemetry, not an answer key. Attach a tree with `nightshift_attach_decision_tree`; do not edit it.',
};
