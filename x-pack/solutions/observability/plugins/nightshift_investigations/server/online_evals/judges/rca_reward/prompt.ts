/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import systemPromptText from './system_prompt.text';

export const RCA_REWARD_TOOL_NAME = 'score_investigation';

export const rcaRewardOutputSchema = lazySchema(() =>
  z.object({
    investigation_produced_evidence: z.boolean(),
    investigation_reasoning: z.string(),
    timeline_contradiction_found: z.boolean(),
    timeline_reasoning: z.string(),
    used_post_incident_evidence: z.boolean(),
    anti_leakage_reasoning: z.string(),
    confidence_overconfident: z.boolean(),
    root_cause_timestamp_minutes_before_onset: z.number().nullish(),
    temporal_proximity_reasoning: z.string(),
  })
);

export type RcaRewardOutput = z.infer<typeof rcaRewardOutputSchema>;

export const rcaRewardPrompt = createPrompt({
  name: 'nightshift_rca_reward',
  description:
    'Scores the evidence, timeline, leakage and confidence of a Nightshift investigation',
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
          '{{{transcript}}}\n\nEvaluate the above investigation according to the criteria in the system prompt.',
      },
    },
    tools: {
      [RCA_REWARD_TOOL_NAME]: {
        description: 'Return the reference-free RCA reward dimensions for the investigation.',
        schema: {
          type: 'object',
          properties: {
            investigation_produced_evidence: {
              type: 'boolean',
              description:
                'True if the agent retrieved and analyzed at least some meaningful evidence (logs, metrics, traces, query results, SQL results). False if the agent had no data to analyze — all tools failed with errors or infrastructure issues, and the final answer is just an explanation of why investigation could not proceed.',
            },
            investigation_reasoning: {
              type: 'string',
              description: 'One sentence: what evidence was retrieved, or why none was available.',
            },
            timeline_contradiction_found: {
              type: 'boolean',
              description:
                "True if the agent's own evidence shows the proposed cause timestamp comes AFTER the metric/alert onset timestamp — a self-contradiction. Only meaningful when investigation_produced_evidence=True.",
            },
            timeline_reasoning: {
              type: 'string',
              description: 'One-sentence explanation of the timeline check.',
            },
            used_post_incident_evidence: {
              type: 'boolean',
              description:
                'True if the agent cited post-incident resolution text, INCIDENT_DECLARED declarations, PEV titles, or mitigation/resolution notes as primary causal evidence.',
            },
            anti_leakage_reasoning: {
              type: 'string',
              description: 'One sentence: what post-incident evidence was used (if any).',
            },
            confidence_overconfident: {
              type: 'boolean',
              description:
                "True if the agent stated high confidence (>= 70%) for a primary cause that appears unsupported or contradicted by the agent's own evidence.",
            },
            root_cause_timestamp_minutes_before_onset: {
              type: 'number',
              description:
                'Estimated number of minutes between the root cause event timestamp and the alert/incident onset timestamp. Positive = cause preceded onset (correct). Omit if no root cause timestamp or no alert onset timestamp was identified in the investigation.',
            },
            temporal_proximity_reasoning: {
              type: 'string',
              description:
                'One sentence: what root cause timestamp and alert onset were found, or why this could not be determined.',
            },
          },
          required: [
            'investigation_produced_evidence',
            'investigation_reasoning',
            'timeline_contradiction_found',
            'timeline_reasoning',
            'used_post_incident_evidence',
            'anti_leakage_reasoning',
            'confidence_overconfident',
            'temporal_proximity_reasoning',
          ],
        },
      },
    },
  } as const)
  .get();
