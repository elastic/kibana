/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertAttachmentData } from '@kbn/onechat-common/attachments';
import { AttachmentType, alertAttachmentDataSchema } from '@kbn/onechat-common/attachments';
import { sanitizeToolId } from '@kbn/onechat-genai-utils/langchain';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import { platformCoreTools } from '@kbn/onechat-common';
import {
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
} from '../tools';

/**
 * Creates the definition for the `alert` attachment type.
 */
export const createAlertAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.alert,
  AlertAttachmentData
> => {
  return {
    id: AttachmentType.alert,
    validate: (input) => {
      const parseResult = alertAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatAlertData(attachment.data) };
        },
      };
    },
    getTools: () => [
      SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
      SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
      SECURITY_LABS_SEARCH_TOOL_ID,
      platformCoreTools.cases,
      platformCoreTools.generateEsql,
    ],
    getAgentDescription: () => {
      const description = `You have access to security alert data. To provide a comprehensive analysis, you MUST gather enriched context by querying for related information.

SECURITY ALERT DATA:
{alertData}

---
MANDATORY WORKFLOW - Complete in order:

1. Extract alert id: kibana.alert.uuid or _id
2. Extract rule name: kibana.alert.rule.name
3. Extract entities: host.name, user.name, service.name
4. Extract MITRE fields: kibana.alert.rule.threat.tactic.id, kibana.alert.rule.threat.technique.id, threat.tactic.id
5. Query RISK SCORES for entities:
   Tool: ${sanitizeToolId(SECURITY_ENTITY_RISK_SCORE_TOOL_ID)}
   Parameters: { identifierType: "host.name", identifier: "MyHostName" }

6. Query ATTACK DISCOVERIES for the extracted alert id:
   Tool: ${sanitizeToolId(SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID)}
   Parameters: { alertIds: ["[alert ID]"] }

7. Query CASES with the extracted alert id to find related cases. Case URLs must be included in response.
   Tool: ${sanitizeToolId(platformCoreTools.cases)}
   Parameters: { query: "Do I have any open security cases with an attached alert id of [alert ID]?", owner: "securitySolution" }

8. Query SECURITY LABS:
   Tool: ${sanitizeToolId(SECURITY_LABS_SEARCH_TOOL_ID)}
   Parameters: { query: "Find Security Labs articles about [MITRE technique or rule name]" }

9. Generate ESQL for related entities:
   Tool: ${sanitizeToolId(platformCoreTools.generateEsql)}
   Parameters: { query: "Write ESQL query to find events in the security solution data view from host.name: "MyHostName" }

CRITICAL: You MUST call all 5 tools (steps 5-9) before responding. Do not skip any step.`;
      // TODO add this once product doc tool available
      // 9. Query PRODUCT DOCUMENTATION:
      //   Tool: ${sanitizeToolId(platformCoreTools.productDocumentation)}
      // Parameters: { query: "Find alert triage steps", product: "security" }
      //
      // CRITICAL: You MUST call all 6 tools (steps 5-10) before responding. Do not skip any step.`;
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
