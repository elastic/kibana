/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { SECURITY_ENTITY_RISK_SCORE_TOOL_ID } from '../tools';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

const riskEntityAttachmentDataSchema = securityAttachmentDataSchema.extend({
  identifierType: z.enum(['host', 'user', 'service', 'generic']),
  identifier: z.string().min(1),
});

/**
 * Creates the definition for the `entity` attachment type.
 */
export const createEntityAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.entity,
    validate: (input) => {
      const parseResult = riskEntityAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: () => ({}),
    getTools: () => [SECURITY_ENTITY_RISK_SCORE_TOOL_ID],
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
