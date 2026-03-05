/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { z } from '@kbn/zod';
import {
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
} from '../../tools';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';

export const alertAnalysisSkill = defineSkillType({
  id: 'alert-analysis',
  name: 'alert-analysis',
  basePath: 'skills/security/alerts',
  description:
    'Alert triage and investigation: fetch alerts, find related alerts by shared entities, ' +
    'correlate with Security Labs threat intelligence, assess severity, and determine disposition. ' +
    'Use when investigating a specific alert, triaging alert queues, or understanding alert context.',
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

### 5. Determine Disposition
- **True Positive** → Escalate: Create a case, attach the alert, recommend containment actions
- **Benign True Positive** → Exception: The alert is technically correct but the activity is known-good (e.g., admin tooling)
- **False Positive** → Tune: The rule needs adjustment to avoid this class of alerts
- **Needs More Data** → Expand investigation: Widen time window, check additional data sources

### 6. Synthesize Findings
- Compile a comprehensive analysis with supporting evidence
- Provide clear threat assessment: severity, confidence level, affected scope
- Recommend specific next steps based on disposition
- Reference the detection-engineering skill if rule tuning or exception creation is needed

## Best Practices
- Always start with the alert details before expanding investigation scope
- Use entity relationships to efficiently find related security data
- Maintain chronological context when analyzing events and alerts
- Prioritize high-severity alerts and entities with critical asset criticality
- Document your analysis reasoning for future reference
- Cross-reference multiple data points before making disposition decisions`,
  referencedContent: [
    {
      relativePath: './queries',
      name: 'related-by-entities',
      content: `# Find Alerts Related by Shared Entities

\`\`\`esql
FROM .alerts-security.alerts-* METADATA _id, _index
| WHERE (
    host.name == "ENTITY_VALUE_PLACEHOLDER" OR
    user.name == "ENTITY_VALUE_PLACEHOLDER" OR
    source.ip == "ENTITY_VALUE_PLACEHOLDER" OR
    destination.ip == "ENTITY_VALUE_PLACEHOLDER"
  )
| WHERE @timestamp >= NOW() - 7 DAYS
| KEEP _id, _index, @timestamp, kibana.alert.rule.name, kibana.alert.severity,
       kibana.alert.workflow_status, host.name, user.name, source.ip,
       destination.ip, message
| SORT @timestamp DESC
| LIMIT 100
\`\`\``,
    },
  ],
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
        'Find alerts that share entities (host.name, user.name, source.ip, destination.ip) with a given alert. Returns related alerts within the specified time window.',
      schema: z.object({
        alertId: z.string().describe('The _id of the alert to find related alerts for'),
        timeWindowHours: z
          .number()
          .min(1)
          .max(168)
          .default(24)
          .describe('Time window in hours to search for related alerts (1-168, default 24)'),
      }),
      handler: async ({ alertId, timeWindowHours }, context) => {
        try {
          const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${context.spaceId}`;

          const alertResult = await context.esClient.asCurrentUser.get({
            index: alertsIndex,
            id: alertId,
          });

          const alertSource = alertResult._source as Record<string, unknown> | undefined;
          if (!alertSource) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: { message: `Alert ${alertId} not found or has no source data.` },
                },
              ],
            };
          }

          const entities: string[] = [];
          const hostName = getNestedValue(alertSource, 'host.name');
          const userName = getNestedValue(alertSource, 'user.name');
          const sourceIp = getNestedValue(alertSource, 'source.ip');
          const destIp = getNestedValue(alertSource, 'destination.ip');

          if (hostName) entities.push(hostName);
          if (userName) entities.push(userName);
          if (sourceIp) entities.push(sourceIp);
          if (destIp) entities.push(destIp);

          if (entities.length === 0) {
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    message: 'No entity values found on the source alert to correlate.',
                    relatedAlerts: [],
                  },
                },
              ],
            };
          }

          const shouldClauses = [];
          if (hostName) shouldClauses.push({ term: { 'host.name': hostName } });
          if (userName) shouldClauses.push({ term: { 'user.name': userName } });
          if (sourceIp) shouldClauses.push({ term: { 'source.ip': sourceIp } });
          if (destIp) shouldClauses.push({ term: { 'destination.ip': destIp } });

          const searchResult = await context.esClient.asCurrentUser.search({
            index: alertsIndex,
            size: 50,
            query: {
              bool: {
                must: [
                  {
                    range: {
                      '@timestamp': {
                        gte: `now-${timeWindowHours}h`,
                      },
                    },
                  },
                ],
                should: shouldClauses,
                minimum_should_match: 1,
                must_not: [{ ids: { values: [alertId] } }],
              },
            },
            sort: [{ '@timestamp': 'desc' }],
            _source: [
              '@timestamp',
              'kibana.alert.rule.name',
              'kibana.alert.severity',
              'kibana.alert.risk_score',
              'kibana.alert.workflow_status',
              'kibana.alert.reason',
              'kibana.alert.rule.threat',
              'host.name',
              'user.name',
              'source.ip',
              'destination.ip',
              'process.name',
              'process.executable',
              'file.name',
              'file.path',
              'message',
            ],
            ignore_unavailable: true,
          });

          const relatedAlerts = searchResult.hits.hits.map((hit) => ({
            _id: hit._id,
            _index: hit._index,
            ...(hit._source as Record<string, unknown>),
          }));

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: `Found ${relatedAlerts.length} related alerts sharing entities with alert ${alertId}.`,
                  sourceEntities: { hostName, userName, sourceIp, destIp },
                  relatedAlerts,
                },
              },
            ],
          };
        } catch (error) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Failed to find related alerts: ${error.message}`,
                },
              },
            ],
          };
        }
      },
    },
  ],
});

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  if (typeof current === 'string') return current;
  if (Array.isArray(current) && current.length > 0 && typeof current[0] === 'string') {
    return current[0];
  }
  return undefined;
}
