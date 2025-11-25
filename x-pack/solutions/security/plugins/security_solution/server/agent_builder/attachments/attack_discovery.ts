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
import { platformCoreTools } from '@kbn/onechat-common';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { SECURITY_ENTITY_RISK_SCORE_TOOL_ID, SECURITY_LABS_SEARCH_TOOL_ID } from '../tools';

export const attackDiscoveryAttachmentDataSchema = z.object({
  attackDiscovery: z.string(),
});

/**
 * Data for an attack discovery attachment.
 */
export type AttackDiscoveryAttachmentData = z.infer<typeof attackDiscoveryAttachmentDataSchema>;

/**
 * Type guard to narrow attachment data to AttackDiscoveryAttachmentData
 */
const isAttackDiscoveryAttachmentData = (data: unknown): data is AttackDiscoveryAttachmentData => {
  return attackDiscoveryAttachmentDataSchema.safeParse(data).success;
};

/**
 * Creates the definition for the `attack_discovery` attachment type.
 */
export const createAttackDiscoveryAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.attack_discovery,
    validate: (input) => {
      const parseResult = attackDiscoveryAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment: Attachment<string, unknown>) => {
      // Extract data to allow proper type narrowing
      const data = attachment.data;
      // Type narrowing: validation ensures data matches AttackDiscoveryAttachmentData
      if (!isAttackDiscoveryAttachmentData(data)) {
        throw new Error(`Invalid attack discovery attachment data for attachment ${attachment.id}`);
      }
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatAttackDiscoveryData(data) };
        },
      };
    },
    getTools: () => [
      SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
      SECURITY_LABS_SEARCH_TOOL_ID,
      platformCoreTools.cases,
    ],
    getAgentDescription: () => {
      const description = `You have access to security attack discovery data. To provide a comprehensive analysis, you MUST gather enriched context by querying for related information.

ATTACK DISCOVERY DATA:
{attackDiscoveryData}

---
MANDATORY WORKFLOW - Complete in order:

1. Extract entities from the attack discovery:
   - host.name (extract all host names mentioned)
   - user.name (extract all user names mentioned)
   - service.name (extract all service names mentioned)

2. Extract MITRE tactics/techniques from the attack discovery:
   - Look for MITRE ATT&CK tactics in the "Attack Chain" section
   - Extract tactic IDs and technique IDs if mentioned

3. Extract alert IDs from the attack discovery:
   - Look for alert IDs referenced in the attack discovery
   - These may be mentioned in the details or summary sections

4. Query ENTITY RISK SCORE for entities:
   Tool: ${sanitizeToolId(SECURITY_ENTITY_RISK_SCORE_TOOL_ID)}
   Parameters: { identifierType: "host.name", identifier: "[host name]" }
   Repeat for each unique host.name, user.name found

5. Query SECURITY LABS for MITRE tactics/techniques:
   Tool: ${sanitizeToolId(SECURITY_LABS_SEARCH_TOOL_ID)}
   Parameters: { query: "Find Security Labs articles about [MITRE tactic or technique]" }

6. Query CASES with alert IDs from the attack discovery to find related cases. Case URLs must be included in response.
   Tool: ${sanitizeToolId(platformCoreTools.cases)}
   Parameters: { query: "Do I have any open security cases?", alertIds: ["[alert ID]"], owner: "securitySolution" }

CRITICAL: You MUST call all 3 tools (steps 4-6) before responding. Do not skip any step.`;
      return description;
    },
  };
};

/**
 * Formats attack discovery data for display.
 *
 * @param data - The attack discovery attachment data containing the attack discovery string
 * @returns Formatted string representation of the attack discovery data
 */
const formatAttackDiscoveryData = (data: AttackDiscoveryAttachmentData): string => {
  return data.attackDiscovery;
};
