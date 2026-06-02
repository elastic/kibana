/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
} from '../../tools';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';
import { relatedAlertsInlineToolSchema } from '../../../../common/api/alert_analysis/related_alerts';
import {
  findRelatedAlerts,
  RELATED_ALERTS_INLINE_MAX_RESULTS,
} from '../../../lib/alert_analysis/services/find_related_alerts';

export const alertAnalysisSkill = defineSkillType({
  id: 'alert-analysis',
  name: 'alert-analysis',
  basePath: 'skills/security/alerts',
  description:
    'Alert triage and investigation: fetch alerts, correlate related alerts via a focused inline tool, ' +
    'enrich with Security Labs threat intelligence, and assess entity risk to determine disposition.',
  content: `# Alert Analysis Guide

## When to Use This Skill

Use this skill when:
- Triaging a specific security alert to determine if it is a true or false positive
- Investigating alerts to understand their context and impact
- Finding related alerts that share entities (hosts, users, IPs) with a known alert
- Enriching alert data with threat intelligence from Elastic Security Labs
- Assessing entity risk scores for hosts or users involved in alerts

## Alert Analysis Process

### 1. Initial Alert Assessment
- Fetch the alert using 'security.alerts' to retrieve core details
- Review: severity, timestamp, rule name, description, MITRE ATT&CK technique
- Identify key entities: users (user.name), hosts (host.name), IPs (source.ip, destination.ip), file hashes
- Note the alert's workflow status and any existing assignments

### 2. Find Related Alerts
- Use 'security.alert-analysis.get-related-alerts' to find alerts sharing entities with the investigated alert
- Specify the alert ID and an appropriate time window (default 24h, extend to 168h for slow attacks)
- If you already have entity values (host.name, user.name, source.ip, destination.ip) from a previous tool call, pass them as optional parameters; any missing values are merged from the alert document
- Review the related alerts for patterns: same rule triggering, escalating severity, or multi-stage attack chains

### 3. Search Security Labs
- Query Elastic Security Labs using 'security.security_labs_search' for:
  - Known threat actor TTPs matching the alert's MITRE technique
  - Malware family information if process hashes or names are available
  - IOC context for IPs, domains, or file hashes found in the alert

### 4. Assess Entity Risk
- Check entity risk scores using 'security.entity_risk_score' for involved hosts and users
- High risk scores (>80) on involved entities increase alert priority
- Compare current risk level with historical baseline
- For deeper entity profiling (asset criticality, behavioral history, entity store lookups), reference the entity-analytics skill

### 5. Determine Disposition
- **True Positive** → Escalate: Create a case, attach the alert, recommend containment actions
- **Benign True Positive** → Exception: The alert is technically correct but the activity is known-good (e.g., admin tooling)
- **False Positive** → Tune: The rule needs adjustment to avoid this class of alerts
- **Needs More Data** → Expand investigation: Widen time window, check additional data sources

### 6. Synthesize Findings
- Compile a comprehensive analysis with supporting evidence
- Provide clear threat assessment: severity, confidence level, affected scope
- Recommend specific next steps based on disposition
- Reference the entity-analytics skill for deeper entity profiling or asset criticality review

## Tool Selection Guardrails
- For list/prioritization questions (e.g. "high/critical alerts in last 24h"), use only 'security.alerts' unless explicit correlation by alertId is requested.
- For Security Labs intel questions (e.g. "Lazarus Group techniques"), use only 'security.security_labs_search'.
- For risk score questions (e.g. "risk score for host DC01"), use only 'security.entity_risk_score'.
- For correlation requests that include an alertId, call 'security.alert-analysis.get-related-alerts' directly.
- Do NOT use platform.core.search or workflow tools for related-alert correlation when an alertId is available.

## Best Practices
- Always start with the alert details before expanding investigation scope
- Use entity relationships to efficiently find related security data
- Maintain chronological context when analyzing events and alerts
- Prioritize high-severity alerts and entities with critical asset criticality
- Document your analysis reasoning for future reference
- Cross-reference multiple data points before making disposition decisions`,
  getRegistryTools: () => [
    SECURITY_ALERTS_TOOL_ID,
    SECURITY_LABS_SEARCH_TOOL_ID,
    SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  ],
  getInlineTools: () => [
    {
      id: 'security.alert-analysis.get-related-alerts',
      type: ToolType.builtin,
      description:
        'Find alerts that share entities (host.name, user.name, source.ip, destination.ip) with a given alert. Returns related alerts within the specified time window. Pass entity values directly when already available; missing values are merged from the alert.',
      schema: relatedAlertsInlineToolSchema,
      handler: async (args, context) => {
        const { alertId, timeWindowHours, hostNames, userNames, sourceIps, destIps } =
          relatedAlertsInlineToolSchema.parse(args);

        const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${context.spaceId}`;

        const result = await findRelatedAlerts(context.esClient.asCurrentUser, {
          alertId,
          alertsIndex,
          timeWindowHours,
          maxResults: RELATED_ALERTS_INLINE_MAX_RESULTS,
          hostNames,
          userNames,
          sourceIps,
          destIps,
        });

        if (!result.ok) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: { message: result.message },
              },
            ],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: result.message,
                sourceEntities: result.sourceEntities,
                relatedAlerts: result.relatedAlerts,
              },
            },
          ],
        };
      },
    },
  ],
});
