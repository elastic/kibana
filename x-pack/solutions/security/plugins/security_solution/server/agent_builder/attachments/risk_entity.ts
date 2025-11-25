/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { sanitizeToolId } from '@kbn/onechat-genai-utils/langchain';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import type { Attachment } from '@kbn/onechat-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { SECURITY_ENTITY_RISK_SCORE_TOOL_ID } from '../tools';
const riskEntityAttachmentDataSchema = z.object({
  identifierType: z.enum(['host', 'user', 'service', 'generic']),
  identifier: z.string().min(1),
});

/**
 * Data for a risk entity attachment.
 * Note: After validation, the data is stored as a formatted string.
 */
type RiskEntityAttachmentData = z.infer<typeof riskEntityAttachmentDataSchema>;

/**
 * Type guard to check if data is a formatted risk entity string
 */
const isRiskEntityFormattedData = (data: unknown): data is string => {
  return (
    typeof data === 'string' && data.includes('identifier:') && data.includes('identifierType:')
  );
};

/**
 * Creates the definition for the `risk_entity` attachment type.
 */
export const createRiskEntityAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.alert,
    validate: (input) => {
      const parseResult = riskEntityAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: formatRiskEntityData(parseResult.data) };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment: Attachment<string, unknown>) => {
      // Extract data to allow proper type narrowing
      const data = attachment.data;
      // Type narrowing: validation ensures data is a formatted string
      if (!isRiskEntityFormattedData(data)) {
        throw new Error(`Invalid risk entity attachment data for attachment ${attachment.id}`);
      }
      return {
        getRepresentation: () => {
          return { type: 'text', value: data };
        },
      };
    },
    getTools: () => [SECURITY_ENTITY_RISK_SCORE_TOOL_ID],
    getAgentDescription: () => {
      const description = `You have access to a risk entity that needs to be evaluated. The entity has an identifierType and identifier that you should use to query the risk score.

RISK ENTITY DATA:
{riskEntityData}

---
MANDATORY WORKFLOW:

1. Extract the identifierType and identifier from the risk entity data above.

2. Query ENTITY RISK SCORE for the entity:
   Tool: ${sanitizeToolId(SECURITY_ENTITY_RISK_SCORE_TOOL_ID)}
   Parameters: { identifierType: "[extracted identifierType]", identifier: "[extracted identifier]" }

CRITICAL: You MUST call ${sanitizeToolId(
        SECURITY_ENTITY_RISK_SCORE_TOOL_ID
      )} with the extracted identifierType and identifier before responding.`;
      return description;
    },
  };
};

const formatRiskEntityData = (data: RiskEntityAttachmentData): string => {
  return `identifier: ${data.identifier}, identifierType: ${data.identifierType}`;
};
