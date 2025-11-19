/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertAttachmentData } from '@kbn/onechat-common/attachments';
import { AttachmentType, alertAttachmentDataSchema } from '@kbn/onechat-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import { platformCoreTools } from '@kbn/onechat-common/tools';

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
    getTools: () => {
      const tools = [
        platformCoreTools.generateEsql,
        platformCoreTools.executeEsql,
        platformCoreTools.search,
      ];
      return tools;
    },
    getAgentDescription: () => {
      const description = `You have access to security alert data. To provide a comprehensive analysis, you MUST gather enriched context by querying for related information.

SECURITY ALERT DATA:
{alertData}

---

MANDATORY WORKFLOW - Complete in order:

1. Extract entities: host.name, user.name, source.ip, destination.ip, file.hash.sha256, kibana.alert.uuid (or _id), kibana.alert.rule.name, kibana.alert.rule.threat.tactic.id, kibana.alert.rule.threat.technique.id, event.category, event.action

2. Query RELATED ALERTS:
   Tool: ${platformCoreTools.search}
   Parameters: { query: "Find security alerts from last 7 days where host.name is '[host]' OR user.name is '[user]' OR source.ip is '[ip]' OR destination.ip is '[dest_ip]'", index: ".alerts-security.alerts-*" }

3. Query RISK SCORES:
   Tool: ${platformCoreTools.search}
   Parameters: { query: "Find risk scores for host.name '[host]' OR user.name '[user]'", index: "risk-score.risk-score-latest-default" }

4. Query ATTACK DISCOVERIES:
   Tool: ${platformCoreTools.search}
   Parameters: { query: "Find attack discoveries where kibana.alert.attack_discovery.alert_ids contains '[alert ID]'", index: ".alerts-security.alerts-attack.discovery-*,.adhoc.alerts-security.alerts-attack.discovery-*" }

5. Query SECURITY LABS:
   Tool: ${platformCoreTools.search}
   Parameters: { query: "Find Security Labs articles about [MITRE technique or rule name]", index: ".kibana-elastic-ai-assistant-knowledge-base-*" }

CRITICAL: You MUST call all 4 tools (steps 2-5) before responding. Do not skip any step.`;
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
