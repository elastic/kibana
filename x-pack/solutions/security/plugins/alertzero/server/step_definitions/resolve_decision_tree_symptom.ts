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
import { deriveDecisionTreeSymptom } from '../decision_trees/symptom';

const optionalLabel = z.string().max(2_048).optional();

export const resolveDecisionTreeSymptomStepDefinition = () =>
  createServerStepDefinition({
    id: 'alertzero.resolveDecisionTreeSymptom',
    label: i18n.translate('xpack.alertzero.workflows.steps.resolveDecisionTreeSymptom.label', {
      defaultMessage: 'Resolve decision tree symptom',
    }),
    category: StepCategory.Ai,
    description: i18n.translate(
      'xpack.alertzero.workflows.steps.resolveDecisionTreeSymptom.description',
      {
        defaultMessage:
          'Derives the decision-tree symptom slug from a technique id or rule name. Skips when neither yields a valid slug.',
      }
    ),
    inputSchema: z.object({
      subtechnique_id: optionalLabel.describe('First MITRE sub-technique id, when the alert has one.'),
      technique_id: optionalLabel.describe('First MITRE technique id, when the alert has one.'),
      rule_name: optionalLabel.describe('Detection rule name, used when no technique id is usable.'),
      space_id: z.string().min(1).max(256).describe('Space that owns the tree.'),
    }),
    outputSchema: z.object({
      skipped: z.boolean().describe('True when this run has no reusable symptom.'),
      symptom: z.string().describe('Symptom slug. Empty when skipped.'),
      ki_id: z.string().describe('Knowledge item id, scoped to the space. Empty when skipped.'),
    }),
    handler: async (context) => {
      const { subtechnique_id: subtechniqueId, technique_id: techniqueId, rule_name: ruleName, space_id: spaceId } =
        context.input;
      const derived = deriveDecisionTreeSymptom({
        subtechniqueId,
        techniqueId,
        ruleName,
        spaceId,
      });
      if (!derived) {
        return { output: { skipped: true, symptom: '', ki_id: '' } };
      }
      return { output: { skipped: false, symptom: derived.symptom, ki_id: derived.kiId } };
    },
  });
