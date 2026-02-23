/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common/tools';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { z } from '@kbn/zod';

/**
 * DISCLAIMER: This skill is a sample skill. It is not registered.
 *
 * Threat analysis skill for security operations.
 * This skill helps analyze security threats, investigate alerts, and assess risk.
 */
export const alertAnalysisSampleSkill = defineSkillType({
  id: 'alert-analysis',
  name: 'alert-analysis',
  basePath: 'skills/security/alerts',
  description:
    'Comprehensive guide to analyze a security alert, finding related alerts, events and cases and identifying potential threats.',
  content: `# Alert Analysis Guide

## Alert Analysis Process

### 1. Initial Alert Assessment
- Fetch the alert
- Review the alert's core details: severity, timestamp, rule name, and description
- Identify key entities involved: users, hosts, IP addresses, file hashes, domains
- Understand the alert context: what triggered it, what it indicates
- Note the alert's status and any existing assignments or comments

### 2. Find Related Alerts
- Search for alerts involving the same entities (users, hosts, IPs) within a relevant time window using the 'security.alert-analysis.get-related-alerts' tool

### 3. Search security labs
- Query security labs for details about the alert's indicators of compromise (IOCs) using the 'security.security_labs_search' tool

### 4. Find Related Cases
- Search existing security cases that reference the same entities or similar incidents using the 'platform.core.cases' tool
- Check if this alert or similar alerts have been investigated before
- Review case notes and findings from previous investigations
- Identify if this alert should be added to an existing case or requires a new case
- Learn from historical case resolutions and remediation steps

### 5. Identify Potential Threats
- Assess the severity and potential impact of the identified threat
- Determine if this is an isolated incident or part of a coordinated attack
- Evaluate the risk level of affected entities using entity risk scores
- Identify indicators of compromise (IOCs) and attack patterns
- Search threat intelligence sources for known attack techniques or threat actors
- Correlate findings with MITRE ATT&CK framework to understand attack progression

### 6. Synthesize Findings
- Compile a comprehensive analysis of the alert and all related findings
- Provide a clear threat assessment with supporting evidence
- Recommend next steps: investigation priorities, containment actions, or case creation
- Document key findings and relationships for future reference

## Best Practices
- Always start with the alert details before expanding the investigation
- Use entity relationships to find related security data efficiently
- Maintain chronological context when analyzing events and alerts
- Cross-reference findings across alerts, events, and cases for validation
- Prioritize high-severity alerts and critical risk entities
- Document your analysis process and reasoning clearly`,
  referencedContent: [
    {
      relativePath: './queries',
      name: 'related_by_entities',
      content: `FROM .alerts-security.alerts-* METADATA _id, _index
| WHERE (
    host.name == "ENTITY_VALUE_PLACEHOLDER" OR
    user.name == "ENTITY_VALUE_PLACEHOLDER" OR
    source.ip == "ENTITY_VALUE_PLACEHOLDER" OR
    destination.ip == "ENTITY_VALUE_PLACEHOLDER" OR
    entity.name == "ENTITY_VALUE_PLACEHOLDER"
  )
| WHERE @timestamp >= NOW() - INTERVAL 7 DAYS
| KEEP _id, _index, @timestamp, kibana.alert.rule.name, kibana.alert.severity, 
       kibana.alert.workflow_status, host.name, user.name, source.ip, 
       destination.ip, entity.name, entity.type, message
| SORT @timestamp DESC
| LIMIT 100`,
    },
  ],
  getRegistryTools: () => [
    `security.alerts`,
    `security.security_labs_search`,
    `platform.core.cases`,
  ],
  getInlineTools: () => [
    {
      id: 'security.alert-analysis.get-related-alerts',
      type: ToolType.builtin,
      description: 'Get related alerts to the alert',
      schema: z.object({
        alertId: z.string(),
        timeWindowHours: z
          .number()
          .min(1)
          .max(12 * 7)
          .default(24),
      }),
      handler: async (_args, context) => {
        const relatedAlerts = [
          {
            _index: '.internal.alerts-security.alerts-default-000001',
            _id: 'dcca5e4d246937407a184d50ff14c1cee9bb0b2138a5d42b73ff989d3e5ce5c5',
          },
          {
            _index: '.internal.alerts-security.alerts-default-000001',
            _id: 'e365f31e2817fd463ee4c821ec22778e0725e3b530fd1726f6fe0356b8b6cfb5',
          },
          {
            _index: '.internal.alerts-security.alerts-default-000001',
            _id: 'f05e609bd92feaa4609700a849496ca25846d90396756062ead4e642414cb9a7',
          },
        ];
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `Related alerts fetched successfully.\n${JSON.stringify(
                  relatedAlerts,
                  null,
                  2
                )}`,
              },
            },
          ],
        };
      },
    },
  ],
});
