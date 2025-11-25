/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskEntityAttachmentData } from '@kbn/onechat-common/attachments';
import { AttachmentType, riskEntityAttachmentDataSchema } from '@kbn/onechat-common/attachments';
import { sanitizeToolId } from '@kbn/onechat-genai-utils/langchain';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import { SECURITY_ENTITY_RISK_SCORE_TOOL_ID } from '../tools';

/**
 * Creates the definition for the `risk_entity` attachment type.
 */
export const createRiskEntityAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.risk_entity,
  RiskEntityAttachmentData
> => {
  return {
    id: AttachmentType.risk_entity,
    validate: (input) => {
      const parseResult = riskEntityAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: formatRiskEntityData(parseResult.data) };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return { type: 'text', value: attachment.data };
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
