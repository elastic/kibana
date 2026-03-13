/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ExperimentalFeatures } from '../../../common';
import { IdentifierType } from '../../../common/api/entity_analytics/common/common.gen';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import {
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_GET_ENTITY_TOOL_ID,
  SECURITY_SEARCH_ENTITIES_TOOL_ID,
} from '../tools';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

const entityAttachmentDataSchema = securityAttachmentDataSchema.extend({
  entities: z.array(
    z.object({
      entityType: IdentifierType,
      entityId: z.string().min(1),
    })
  ),
});
/**
 * Type guard to check if data is a formatted risk entity string
 */
const isEntityRiskFormattedData = (data: unknown): data is string => {
  return (
    typeof data === 'string' && data.includes('identifier:') && data.includes('identifierType:')
  );
};

/**
 * Creates the definition for the `entity` attachment type.
 */
export const createEntityAttachmentType = (
  experimentalFeatures: ExperimentalFeatures
): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.entity,
    validate: (input) => {
      const parseResult = entityAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment: Attachment<string, unknown>) => {
      console.log(`Formatting entity attachment ${JSON.stringify(attachment)}`);
      // Extract data to allow proper type narrowing
      const data = attachment.data;
      // Necessary because we cannot currently use the AttachmentType type as agent is not
      // registered with enum AttachmentType in agentBuilder attachment_types.ts
      if (!isEntityRiskFormattedData(data)) {
        throw new Error(`Invalid risk entity attachment data for attachment ${attachment.id}`);
      }
      return {
        getRepresentation: () => {
          return { type: 'text', value: data };
        },
      };
    },
    getTools: () =>
      experimentalFeatures.entityAnalyticsEntityStoreV2
        ? [SECURITY_GET_ENTITY_TOOL_ID, SECURITY_SEARCH_ENTITIES_TOOL_ID]
        : [SECURITY_ENTITY_RISK_SCORE_TOOL_ID],
    getAgentDescription: () => {
      const description = `You have access to a risk entity that needs to be evaluated. The entity has an identifierType and identifier that you should use to query the risk score.

RISK ENTITY DATA:
{riskEntityData}

---

1. Extract the identifierType and identifier from the provided risk entity attachment.
2. Use the available tools to gather context about the alert and provide a response.`;
      return description;
    },
  };
};
