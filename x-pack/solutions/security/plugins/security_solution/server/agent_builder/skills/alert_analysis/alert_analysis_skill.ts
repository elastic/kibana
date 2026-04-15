/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { z } from '@kbn/zod/v4';
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
- If you already have entity values (host.name, user.name, source.ip, destination.ip) from a previous tool call, pass them as optional parameters to skip refetching the alert
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
        'Find alerts that share entities (host.name, user.name, source.ip, destination.ip) with a given alert. Returns related alerts within the specified time window. Pass entity values directly if already available to skip refetching the alert.',
      schema: z.object({
        alertId: z.string().describe('The _id of the alert to find related alerts for'),
        timeWindowHours: z
          .number()
          .min(1)
          .max(168)
          .default(24)
          .describe('Time window in hours to search for related alerts (1-168, default 24)'),
        hostNames: z
          .array(z.string())
          .optional()
          .describe(
            'Optional: host.name values from the alert. If provided along with other entity fields, skips fetching the alert.'
          ),
        userNames: z
          .array(z.string())
          .optional()
          .describe(
            'Optional: user.name values from the alert. If provided along with other entity fields, skips fetching the alert.'
          ),
        sourceIps: z
          .array(z.string())
          .optional()
          .describe(
            'Optional: source.ip values from the alert. If provided along with other entity fields, skips fetching the alert.'
          ),
        destIps: z
          .array(z.string())
          .optional()
          .describe(
            'Optional: destination.ip values from the alert. If provided along with other entity fields, skips fetching the alert.'
          ),
      }),
      handler: async (
        {
          alertId,
          timeWindowHours,
          hostNames: providedHostNames,
          userNames: providedUserNames,
          sourceIps: providedSourceIps,
          destIps: providedDestIps,
        },
        context
      ) => {
        const id = String(alertId);
        const hours = Number(timeWindowHours);
        try {
          const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${context.spaceId}`;

          const hasProvidedEntities =
            (Array.isArray(providedHostNames) && providedHostNames.length > 0) ||
            (Array.isArray(providedUserNames) && providedUserNames.length > 0) ||
            (Array.isArray(providedSourceIps) && providedSourceIps.length > 0) ||
            (Array.isArray(providedDestIps) && providedDestIps.length > 0);

          let hostNames: string[];
          let userNames: string[];
          let sourceIps: string[];
          let destIps: string[];

          if (hasProvidedEntities) {
            hostNames = Array.isArray(providedHostNames) ? providedHostNames : [];
            userNames = Array.isArray(providedUserNames) ? providedUserNames : [];
            sourceIps = Array.isArray(providedSourceIps) ? providedSourceIps : [];
            destIps = Array.isArray(providedDestIps) ? providedDestIps : [];
          } else {
            const alertResult = await context.esClient.asCurrentUser.get({
              index: alertsIndex,
              id,
            });

            const alertSource = alertResult._source as Record<string, unknown> | undefined;
            if (!alertSource) {
              return {
                results: [
                  {
                    type: ToolResultType.error,
                    data: { message: `Alert ${id} not found or has no source data.` },
                  },
                ],
              };
            }

            hostNames = getNestedValues(alertSource, 'host.name');
            userNames = getNestedValues(alertSource, 'user.name');
            sourceIps = getNestedValues(alertSource, 'source.ip');
            destIps = getNestedValues(alertSource, 'destination.ip');
          }

          const hasEntities =
            hostNames.length > 0 ||
            userNames.length > 0 ||
            sourceIps.length > 0 ||
            destIps.length > 0;

          if (!hasEntities) {
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

          const shouldClauses: Array<{ terms: Record<string, string[]> }> = [];
          if (hostNames.length > 0) shouldClauses.push({ terms: { 'host.name': hostNames } });
          if (userNames.length > 0) shouldClauses.push({ terms: { 'user.name': userNames } });
          if (sourceIps.length > 0) shouldClauses.push({ terms: { 'source.ip': sourceIps } });
          if (destIps.length > 0) shouldClauses.push({ terms: { 'destination.ip': destIps } });

          const searchResult = await context.esClient.asCurrentUser.search({
            index: alertsIndex,
            size: 50,
            query: {
              bool: {
                must: [
                  {
                    range: {
                      '@timestamp': {
                        gte: `now-${hours}h`,
                      },
                    },
                  },
                ],
                should: shouldClauses,
                minimum_should_match: 1,
                must_not: [{ ids: { values: [id] } }],
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
                  message: `Found ${relatedAlerts.length} related alerts sharing entities with alert ${id}.`,
                  sourceEntities: {
                    hostNames,
                    userNames,
                    sourceIps,
                    destIps,
                  },
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
                  message: `Failed to find related alerts: ${
                    error instanceof Error ? error.message : String(error)
                  }`,
                },
              },
            ],
          };
        }
      },
    },
  ],
});

function getNestedValues(obj: Record<string, unknown>, path: string): string[] {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return [];
    current = (current as Record<string, unknown>)[part];
  }
  if (typeof current === 'string') return [current];
  if (Array.isArray(current)) {
    return current.filter((v): v is string => typeof v === 'string');
  }
  return [];
}
