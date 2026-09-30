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
import { prepareDecisionTreeTurn } from '../decision_trees/prepare_turn';

export const prepareDecisionTreeTurnStepDefinition = () =>
  createServerStepDefinition({
    id: 'alertzero.prepareDecisionTreeTurn',
    label: i18n.translate('xpack.alertzero.workflows.steps.prepareDecisionTreeTurn.label', {
      defaultMessage: 'Prepare decision tree turn',
    }),
    category: StepCategory.Ai,
    description: i18n.translate('xpack.alertzero.workflows.steps.prepareDecisionTreeTurn.description', {
      defaultMessage:
        'Builds the structured-output prompt that drafts or updates a decision tree from a finished forensic analysis.',
    }),
    inputSchema: z.object({
      symptom: z.string().max(80).describe('Symptom slug this tree is stored under.'),
      prior_mermaid: z
        .string()
        .max(65_536)
        .optional()
        .describe('Current diagram, when a tree already exists.'),
      rationale: z.string().max(7_900).describe('Forensic assessment to distill.'),
      propose: z.boolean().describe('Whether the analysis recommended containment.'),
      actions_summary: z
        .string()
        .max(4_000)
        .optional()
        .describe('Recommended action ids, comma-separated.'),
    }),
    outputSchema: z.object({
      skipped: z.boolean().describe('True when there is nothing to distill.'),
      mode: z.enum(['extract', 'reinforce']).describe('Whether this turn creates or updates a tree.'),
      message: z.string().describe('Prompt for the drafting agent. Empty when skipped.'),
    }),
    handler: async (context) => {
      const {
        symptom,
        prior_mermaid: priorMermaid,
        rationale,
        propose,
        actions_summary: actionsSummary,
      } = context.input;
      const prepared = prepareDecisionTreeTurn({
        symptom,
        priorMermaid,
        rationale,
        propose,
        actionsSummary,
      });
      return { output: prepared };
    },
  });
