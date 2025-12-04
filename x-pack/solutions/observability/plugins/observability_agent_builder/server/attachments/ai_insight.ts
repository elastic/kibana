/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import dedent from 'dedent';
import type { Attachment } from '@kbn/onechat-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import {
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
  OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
} from '../../common/constants';
import { OBSERVABILITY_GET_ALERTS_TOOL_ID } from '../tools/get_alerts/get_alerts';

export const OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID = 'observability.ai_insight';

const aiInsightAttachmentDataSchema = z.object({
  context: z.string(),
  summary: z.string(),
});

type AiInsightAttachmentData = z.infer<typeof aiInsightAttachmentDataSchema>;

/**
 * Type guard to ensure `attachment.data` conforms to AiInsightAttachmentData.
 */
const isValidAiInsightAttachmentData = (data: unknown): data is AiInsightAttachmentData => {
  return aiInsightAttachmentDataSchema.safeParse(data).success;
};

export const createAiInsightAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = aiInsightAttachmentDataSchema.safeParse(input);

      if (!parsed.success) {
        return { valid: false, error: parsed.error.message };
      }

      return { valid: true, data: parsed.data };
    },
    format: (attachment: Attachment<string, unknown>) => {
      return {
        getRepresentation: () => {
          // Agent Builder does not apply the attachment schema at `format` time
          // so we re-validate it before using it.
          if (!isValidAiInsightAttachmentData(attachment.data)) {
            throw new Error(`Invalid AI insight attachment data for attachment ${attachment.id}`);
          }

          const { summary, context } = attachment.data;
          const value = [`AI summary:\n${summary}`, `Context data:\n${context}`].join('\n\n');

          return {
            type: 'text',
            value,
          };
        },
      };
    },
    getAgentDescription: () => {
      return dedent(`
        The AI Insight attachment carries a concise natural-language summary (aiSummary) and contextual data (contextData) relevant to observability investigations.
      `);
    },
    getTools: () => [
      OBSERVABILITY_GET_SERVICES_TOOL_ID,
      OBSERVABILITY_GET_ALERTS_TOOL_ID,
      OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
    ],
  };
};
