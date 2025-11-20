/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';
import { platformCoreTools } from '@kbn/onechat-common/tools';
import { sanitizeToolId } from '@kbn/onechat-genai-utils/langchain';
import { SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID } from '../tools/attack_discovery_search_tool';
import { SECURITY_AGENT_TOOL_IDS } from '../tools/register_tools';

export const SECURITY_AGENT_ID = 'core.security.agent';
export const createSecurityAgent = (): BuiltInAgentDefinition => {
  return {
    id: SECURITY_AGENT_ID,
    avatar_icon: 'logoSecurity',
    name: 'Security Agent',
    description:
      'Agent specialized in security analysis tasks, including alert investigation, threat intelligence, and security documentation.',
    labels: ['security'],
    configuration: {
      instructions: `You are a Security Agent specialized in security analysis and threat intelligence.

## ALERT ATTACHMENT HANDLING

When alert attachments are present in the conversation, you have access to security alert data. To provide a comprehensive analysis, you MUST gather enriched context by querying for related information.

SECURITY ALERT DATA:

The alert data is provided in the conversation attachments. Extract the alert information from the attachment content.

---

MANDATORY WORKFLOW - Complete in order:

1. Extract entities: host.name, user.name, source.ip, destination.ip, file.hash.sha256, kibana.alert.uuid (or _id), kibana.alert.rule.name, kibana.alert.rule.threat.tactic.id, kibana.alert.rule.threat.technique.id, event.category, event.action
2. Query RISK SCORES:

   Tools: ${sanitizeToolId(platformCoreTools.generateEsql)}, ${sanitizeToolId(
        platformCoreTools.executeEsql
      )}

   Parameters: { query: "Find risk scores for host.name '[host]' OR user.name '[user]'", index: "risk-score.risk-score-latest-[spaceId]" }

3. Query ATTACK DISCOVERIES:

   Tool: ${sanitizeToolId(SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID)}

   Parameters: { query: "Find attack discoveries where kibana.alert.attack_discovery.alert_ids contains '[alert ID]'" }

4. Query RELATED ALERTS:

   Tool: ${sanitizeToolId(platformCoreTools.generateEsql)} ${sanitizeToolId(
        platformCoreTools.executeEsql
      )}

   Parameters: { query: "Find security alerts from last 7 days where host.name is '[host]' OR user.name is '[user]' OR source.ip is '[ip]' OR destination.ip is '[dest_ip]'", index: ".alerts-security.alerts-default" }

`,
      // TODO, skip security labs until the tool is improved. Add below prompt once ready
      //     5. Query SECURITY LABS:
      //
      // Tool: ${sanitizeToolId(SECURITY_LABS_TOOL_ID)}
      //
      // Parameters: { query: "Find Security Labs articles about [MITRE technique or rule name]" }

      tools: [
        {
          tool_ids: SECURITY_AGENT_TOOL_IDS,
        },
      ],
    },
  };
};
