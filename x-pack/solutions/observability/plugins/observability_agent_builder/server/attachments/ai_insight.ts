/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import type { ResolverTypeDefinition } from '@kbn/agent-context-layer-plugin/server';
import { OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID } from '../../common';
import { observabilityAttachmentDataSchema } from './observability_attachment_data_schema';

const aiInsightAttachmentDataSchema = observabilityAttachmentDataSchema.extend({
  summary: z.string(),
  context: z.string(),
});

type AiInsightAttachmentData = z.infer<typeof aiInsightAttachmentDataSchema>;

/**
 * Type guard to ensure `attachment.data` conforms to AiInsightAttachmentData.
 */
const isValidAiInsightAttachmentData = (data: unknown): data is AiInsightAttachmentData => {
  return aiInsightAttachmentDataSchema.safeParse(data).success;
};

export const createAiInsightAttachmentType = (): ResolverTypeDefinition => {
  return {
    id: OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = aiInsightAttachmentDataSchema.safeParse(input);

      if (!parsed.success) {
        return { valid: false, error: parsed.error.message };
      }

      return { valid: true, data: parsed.data };
    },
    format: (item) => {
      // Re-validate before using attachment data.
      if (!isValidAiInsightAttachmentData(item.data)) {
        throw new Error(`Invalid AI insight attachment data for attachment ${item.id}`);
      }

      const { summary, context } = item.data;
      const value = [`AI summary:\n${summary}`, `Context data:\n${context}`].join('\n\n');

      return { type: 'text', value };
    },
    getAgentDescription: () => {
      return dedent(`
        The AI Insight attachment carries a concise natural-language summary and contextual data relevant to observability investigations.
      `);
    },
  };
};
