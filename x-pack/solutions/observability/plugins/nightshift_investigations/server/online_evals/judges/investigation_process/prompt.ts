/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import { gradeSchema } from '../run_judge';
import systemPromptText from './system_prompt.text';

export const INVESTIGATION_PROCESS_TOOL_NAME = 'score_investigation_process';

export const investigationProcessOutputSchema = lazySchema(() =>
  z.object({
    monitor_semantics: gradeSchema,
    monitor_semantics_reasoning: z.string(),
    decision_tree_applicable: z.boolean(),
    decision_tree_usage: gradeSchema,
    decision_tree_reasoning: z.string(),
    causal_validation: gradeSchema,
    causal_validation_reasoning: z.string(),
    hypothesis_coverage_applicable: z.boolean(),
    hypothesis_coverage: gradeSchema,
    hypothesis_coverage_reasoning: z.string(),
    evidence_grounding: gradeSchema,
    evidence_grounding_reasoning: z.string(),
    stop_condition: gradeSchema,
    stop_condition_reasoning: z.string(),
  })
);

export type InvestigationProcessOutput = z.infer<typeof investigationProcessOutputSchema>;

const grade = (description: string) =>
  ({ type: 'number', description: `Integer 0-3: ${description}` } as const);
const sentence = (description: string) =>
  ({ type: 'string', description: `One sentence explaining ${description}.` } as const);

export const investigationProcessPrompt = createPrompt({
  name: 'nightshift_investigation_process',
  description: 'Scores how a Nightshift investigation was carried out',
  input: lazySchema(() =>
    z.object({
      transcript: z.string(),
    })
  ),
})
  .version({
    system: {
      mustache: {
        template: systemPromptText,
      },
    },
    template: {
      mustache: {
        template:
          '{{{transcript}}}\n\nEvaluate the above investigation process according to the criteria in the system prompt.',
      },
    },
    tools: {
      [INVESTIGATION_PROCESS_TOOL_NAME]: {
        description: 'Return the investigation-process reward dimensions.',
        schema: {
          type: 'object',
          properties: {
            monitor_semantics: grade('monitor semantics/window score.'),
            monitor_semantics_reasoning: sentence('monitor semantics/window handling'),
            decision_tree_applicable: {
              type: 'boolean',
              description: 'True when a relevant decision tree/runbook was available.',
            },
            decision_tree_usage: grade('decision-tree/runbook usage score when applicable.'),
            decision_tree_reasoning: sentence('decision-tree/runbook usage'),
            causal_validation: grade('causal validation score.'),
            causal_validation_reasoning: sentence('causal validation quality'),
            hypothesis_coverage_applicable: {
              type: 'boolean',
              description:
                'False only for direct-signature incidents where alternative coverage is not meaningful.',
            },
            hypothesis_coverage: grade('hypothesis coverage score when applicable.'),
            hypothesis_coverage_reasoning: sentence('hypothesis coverage'),
            evidence_grounding: grade('evidence grounding score.'),
            evidence_grounding_reasoning: sentence('evidence grounding'),
            stop_condition: grade('stop-condition score.'),
            stop_condition_reasoning: sentence('stopping behavior'),
          },
          required: [
            'monitor_semantics',
            'monitor_semantics_reasoning',
            'decision_tree_applicable',
            'decision_tree_usage',
            'decision_tree_reasoning',
            'causal_validation',
            'causal_validation_reasoning',
            'hypothesis_coverage_applicable',
            'hypothesis_coverage',
            'hypothesis_coverage_reasoning',
            'evidence_grounding',
            'evidence_grounding_reasoning',
            'stop_condition',
            'stop_condition_reasoning',
          ],
        },
      },
    },
  } as const)
  .get();
