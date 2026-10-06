/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  SECURITY_DECISION_TREE_STATUS_TENTATIVE,
  SECURITY_DECISION_TREE_TAG,
  SECURITY_DECISION_TREE_TYPE,
} from '../decision_trees/constants';
import { persistDecisionTree } from '../decision_trees/persist';

const boundedStrings = z.array(z.string().max(10_000)).max(100);

export const persistDecisionTreeStepDefinition = () =>
  createServerStepDefinition({
    id: 'alertzero.persistDecisionTree',
    label: i18n.translate('xpack.alertzero.workflows.steps.persistDecisionTree.label', {
      defaultMessage: 'Validate decision tree',
    }),
    category: StepCategory.Ai,
    description: i18n.translate('xpack.alertzero.workflows.steps.persistDecisionTree.description', {
      defaultMessage:
        'Parses a drafted decision tree and applies the shared guardrails. A failing draft is skipped and nothing is written.',
    }),
    inputSchema: z.object({
      symptom: z.string().max(80).describe('Symptom slug this tree is stored under.'),
      ki_id: z.string().max(512).describe('Knowledge item id to write.'),
      prior_mermaid: z.string().max(65_536).optional().describe('Diagram this draft must preserve.'),
      prior_version: z.number().int().min(0).max(1_000_000).optional().describe('Version already stored.'),
      mermaid: z.string().max(65_536).describe('Drafted flowchart.'),
      applicability: z.string().max(10_000).optional().describe('When this tree should be applied.'),
      evidence_gatherer_metadata: boundedStrings
        .optional()
        .describe('Evidence-node descriptions, one `<node_id>: <description>` string each.'),
      keywords: z.array(z.string().max(256)).max(20).optional().describe('Search keywords for the tree.'),
    }),
    outputSchema: z.object({
      skipped: z.boolean().describe('True when the draft was not written.'),
      reason: z.string().describe('Why the draft was skipped. Empty when it is written.'),
      ki_id: z.string(),
      type: z.literal(SECURITY_DECISION_TREE_TYPE),
      title: z.string(),
      description: z.string(),
      content: z.string(),
      tag: z.literal(SECURITY_DECISION_TREE_TAG),
      status: z.literal(SECURITY_DECISION_TREE_STATUS_TENTATIVE),
      version: z.number(),
      symptom: z.string(),
      evidence_gatherer_metadata: z.array(z.string()),
      keywords: z.array(z.string()),
    }),
    handler: async (context) => {
      const {
        symptom,
        ki_id: kiId,
        prior_mermaid: priorMermaid,
        prior_version: priorVersion,
        mermaid,
        applicability,
        evidence_gatherer_metadata: evidenceGathererMetadata,
        keywords,
      } = context.input;
      const persisted = persistDecisionTree({
        symptom,
        kiId,
        priorMermaid,
        priorVersion,
        mermaid,
        applicability,
        evidenceGathererMetadata,
        keywords,
      });
      return {
        output: {
          skipped: persisted.skipped,
          reason: persisted.reason,
          ki_id: persisted.kiId,
          type: persisted.type,
          title: persisted.title,
          description: persisted.description,
          content: persisted.content,
          tag: persisted.tag,
          status: persisted.status,
          version: persisted.version,
          symptom: persisted.symptom,
          evidence_gatherer_metadata: persisted.evidenceGathererMetadata,
          keywords: persisted.keywords,
        },
      };
    },
  });
