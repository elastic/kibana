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
 * DISCLAIMER: This skill is a sample skill.
 *
 * Threat analysis skill for security operations.
 * This skill helps analyze security threats, investigate alerts, and assess risk.
 */
export const alertAnalysisSkill = defineSkillType({
  id: 'security.alert-analysis',
  name: 'alert-analysis',
  path: 'skills/security/alerts',
  description:
    'Comprehensive guide to analyze a security alert, finding related alerts, events and cases and identifying potential threats.',
  body: `# Alert Analysis Guide

## Alert Analysis Process

### 1. Initial Alert Assessment
- Review the alert's core details: severity, timestamp, rule name, and description
- Identify key entities involved: users, hosts, IP addresses, file hashes, domains
- Understand the alert context: what triggered it, what it indicates
- Note the alert's status and any existing assignments or comments

### 2. Find Related Alerts
- Search for alerts involving the same entities (users, hosts, IPs) within a relevant time window
- Look for alerts triggered by the same rule or similar detection rules
- Identify alert patterns: multiple alerts from the same source, repeated behaviors
- Group related alerts to understand if this is part of a larger attack campaign
- Check for alerts with similar attack patterns or MITRE ATT&CK techniques

### 3. Find Related Events
- Retrieve raw security events associated with the alert
- Search for events involving the same entities before and after the alert timestamp
- Correlate events across different data sources (network, endpoint, cloud)
- Identify event sequences that led to the alert or occurred as a result
- Look for anomalous event patterns that might indicate broader compromise

### 4. Find Related Cases
- Search existing security cases that reference the same entities or similar incidents
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
  getAllowedTools: () => [
    `security.alerts`,
    `security.entity_risk_score`,
    `security.attack_discovery_search`,
    `security.security_labs_search`,
  ],
  getInlineTools: () => [
    {
      id: 'security.alert-analysis.get-related-alerts',
      type: ToolType.builtin,
      description: 'Get related alerts to the alert',
      schema: z.object({
        alertId: z.string(),
      }),
      handler: async (_args, context) => {
        // TODO: Implement the handler
        return {
          results: [
            {
              type: ToolResultType.other,
              data: { message: 'Related alerts fetched successfully' },
            },
          ],
        };
      },
    },
  ],
});
