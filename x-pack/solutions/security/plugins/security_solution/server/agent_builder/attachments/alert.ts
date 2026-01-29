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

    // Skills to reference when this attachment is present
    skills: [
      'security.alert_triage',
      'security.detection_rules',
      'security.cases',
      'security.get_alerts',
    ],

    // LLM guidance for security alert investigation
    skillContent: `# Security Alert Investigation

A security alert is attached to this conversation. Follow this investigation workflow:

## Investigation Steps
1. **Triage**: Determine alert severity and potential impact
2. **Context Gathering**: 
   - Check entity risk scores for involved hosts/users
   - Look for related alerts in the same timeframe
   - Review the detection rule that triggered this alert
3. **Threat Intel**: Search Elastic Security Labs for related threat information
4. **Analysis**: Correlate findings and determine if this is a true positive
5. **Response**: Recommend appropriate actions based on findings

## Available Security Skills
- **alert_triage**: Analyze alerts and determine severity
- **detection_rules**: Review and understand the triggering rule
- **cases**: Add to a case for tracking if confirmed
- **get_alerts**: Query for related alerts

## MITRE ATT&CK
If the alert includes MITRE ATT&CK information:
- Review the tactics and techniques
- Understand the attack chain
- Check for indicators of related activity`,

    // Entity recognition patterns for auto-attachment
    entityRecognition: {
      patterns: [
        /alert\s+["']?([a-zA-Z0-9_-]+)["']?/i,
        /investigate\s+alert\s+["']?([a-zA-Z0-9_-]+)["']?/i,
        /security\s+alert\s+["']?([a-zA-Z0-9_-]+)["']?/i,
      ],
      extractId: (match) => match[1],
      resolve: async (entityId, context) => {
        // TODO: Implement resolution from alerts index
        return null;
      },
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
