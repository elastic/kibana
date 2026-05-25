/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import {
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_ALERTS_TOOL_ID,
} from '../tools';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

export const caseAttachmentDataSchema = securityAttachmentDataSchema.extend({
  case_id: z.string(),
  owner: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
});

export type CaseAttachmentData = z.infer<typeof caseAttachmentDataSchema>;

const isCaseAttachmentData = (data: unknown): data is CaseAttachmentData => {
  return caseAttachmentDataSchema.safeParse(data).success;
};

export const createCaseAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.case,
    validate: (input) => {
      const parseResult = caseAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment: Attachment<string, unknown>) => {
      const data = attachment.data;
      if (!isCaseAttachmentData(data)) {
        throw new Error(`Invalid security case attachment data for attachment ${attachment.id}`);
      }
      return {
        getRepresentation: () => ({
          type: 'text' as const,
          value: formatCaseData(data),
        }),
      };
    },
    getTools: () => [
      SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
      SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
      SECURITY_LABS_SEARCH_TOOL_ID,
      SECURITY_ALERTS_TOOL_ID,
      platformCoreTools.cases,
      platformCoreTools.generateEsql,
      platformCoreTools.productDocumentation,
    ],
    getAgentDescription: () => {
      return `You are assisting with a Security case. Use security and cases tools for full context.

SECURITY CASE:
{caseData}

1. Load the case by case_id via the cases tool.
2. Review linked alerts and entities.
3. Provide actionable investigation guidance.`;
    },
  };
};

const formatCaseData = (data: CaseAttachmentData): string => {
  const lines = [
    `case_id: ${data.case_id}`,
    `owner: ${data.owner}`,
    ...(data.title ? [`title: ${data.title}`] : []),
    ...(data.description ? [`description: ${data.description}`] : []),
  ];
  return lines.join('\n');
};
