/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
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

export const alertAttachmentDataSchema = securityAttachmentDataSchema.extend({
  alert: z.string(),
});

/**
 * Data for an alert attachment.
 */
export type AlertAttachmentData = z.infer<typeof alertAttachmentDataSchema>;

/**
 * Type guard to narrow attachment data to AlertAttachmentData
 */
const isAlertAttachmentData = (data: unknown): data is AlertAttachmentData => {
  return alertAttachmentDataSchema.safeParse(data).success;
};

/**
 * Creates the definition for the `alert` attachment type.
 */
export const createAlertAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.alert,
    validate: (input) => {
      const parseResult = alertAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment: Attachment<string, unknown>) => {
      // Extract data to allow proper type narrowing
      const data = attachment.data;
      // Necessary because we cannot currently use the AttachmentType type as agent is not
      // registered with enum AttachmentType in agentBuilder attachment_types.ts
      if (!isAlertAttachmentData(data)) {
        throw new Error(`Invalid alert attachment data for attachment ${attachment.id}`);
      }
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatAlertData(data) };
        },
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
      const description = `You have access to security alert data. To provide a comprehensive analysis, you MUST gather enriched context by querying for related information.

SECURITY ALERT DATA:
{alertData}

---
Complete in order:

1. Extract alert id(s): _id
2. Extract rule name: kibana.alert.rule.name
3. Extract entities: host.name, user.name, service.name
4. Extract MITRE fields: kibana.alert.rule.threat.tactic.id, kibana.alert.rule.threat.technique.id, threat.tactic.id
5. Use the available tools to gather context about the alert and provide a response.`;
      return description;
    },
  };
};

/**
 * Formats alert data for display.
 *
 * @param data - The alert attachment data containing the alert string
 * @returns Formatted string representation of the alert data
 */
const formatAlertData = (data: AlertAttachmentData): string => {
  return data.alert;
};
