/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';

export const AesopCaptureDatasetStepId = 'security.aesopCaptureDataset' as const;

export const AESOP_CAPTURE_MAX_CONVERSATIONS = 50;
export const AESOP_CAPTURE_DEFAULT_SIMILARITY = 0.8;

export const aesopCaptureDatasetInputSchema = lazySchema(() =>
  z.object({
    agent_id: z.string().min(1).max(256).describe('Agent whose conversations are captured'),
    query: z
      .string()
      .min(1)
      .max(256)
      .describe(
        'Case-insensitive text a conversation title must contain; matched over the newest 500 conversations of the agent'
      ),
    dataset_name: z.string().min(1).max(256).describe('Evals dataset to upsert into'),
    // Omitted description/tags keep an existing dataset's values.
    dataset_description: z.string().max(2048).optional(),
    tags: z.array(z.string().max(128)).max(20).optional(),
    max_conversations: z
      .number()
      .int()
      .min(1)
      .max(AESOP_CAPTURE_MAX_CONVERSATIONS)
      .default(AESOP_CAPTURE_MAX_CONVERSATIONS),
    similarity_threshold: z
      .number()
      .min(0)
      .max(1)
      .default(AESOP_CAPTURE_DEFAULT_SIMILARITY)
      .describe(
        'Captured inputs whose Jaccard similarity to a kept input reaches this are dropped'
      ),
  })
);

export const aesopCaptureDatasetOutputSchema = lazySchema(() =>
  z.object({
    dataset_id: z.string().nullable().describe('Null when there was nothing to upsert'),
    conversations_read: z.number().int(),
    captured: z.number().int().describe('Examples taken from conversations before deduplication'),
    skipped_duplicates: z.number().int(),
    added: z.number().int(),
    removed: z.number().int(),
    unchanged: z.number().int(),
  })
);

export const aesopCaptureDatasetStepCommonDefinition: BaseStepDefinition<
  typeof aesopCaptureDatasetInputSchema,
  typeof aesopCaptureDatasetOutputSchema
> = {
  id: AesopCaptureDatasetStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.aesopCaptureDataset.label', {
    defaultMessage: 'Capture AESOP dataset',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.aesopCaptureDataset.description',
    {
      defaultMessage:
        'Turns an agent’s completed conversation rounds into evaluation dataset examples, dropping near-duplicates of what the dataset already holds.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  inputSchema: aesopCaptureDatasetInputSchema,
  outputSchema: aesopCaptureDatasetOutputSchema,
  stability: 'tech_preview',
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.aesopCaptureDataset.documentation.details',
      {
        defaultMessage:
          'Searches the agent’s conversations, reads each one, and maps every completed round to an example with the user message as input, the assistant message as output and the conversation as metadata. Examples whose input has a Jaccard similarity at or above the threshold to an existing or already kept example are dropped. The result is merged with the existing examples and upserted; because the existing examples are sent back with it, `removed` stays 0 unless the dataset changed during the run.',
      }
    ),
    examples: [
      `## Capture conversations into a dataset
\`\`\`yaml
- name: capture
  type: security.aesopCaptureDataset
  with:
    agent_id: aesop-ab-agent
    query: "alert"
    dataset_name: aesop-captured
\`\`\``,
    ],
  },
};
