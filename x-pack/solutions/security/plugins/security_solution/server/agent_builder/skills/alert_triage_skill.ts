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
 * Stubbed alert triage skill for demo purposes.
 * Covers plan steps: Gather Alert Details & Compile Findings.
 */
export const alertTriageSkill = defineSkillType({
  id: 'alert-triage',
  name: 'alert-triage',
  basePath: 'skills/security/alerts',
  description:
    'Triage a security alert by gathering its details, assessing severity, reviewing detection rule context, and compiling findings into a structured summary with recommended response actions.',
  content: `# Alert Triage Skill

## Overview
Use this skill to systematically triage a security alert. It covers the initial data gathering
and final findings compilation stages of an alert investigation.

## Process

### Step 1: Gather Alert Details
- Use the \`security.alert-triage.fetch-alert\` tool to retrieve the full alert document
- Review: alert name, severity, MITRE ATT&CK tactics/techniques, timestamps, detection rule
- Identify the triggering event and key entities (host, user, IP, file hash)
- Check the alert's workflow status and any prior analyst assignments

### Step 2: Review Detection Rule Context
- Examine the detection rule that generated the alert
- Understand what behavior pattern was matched
- Check for known false-positive patterns or tuning notes

### Step 3: Compile Findings & Determine Severity
- Summarize all gathered evidence from the investigation
- Assess: true positive vs false positive likelihood
- Determine overall risk using the severity matrix:
  - **Critical**: Active exploitation confirmed, data exfiltration or lateral movement observed
  - **High**: Strong indicators of compromise, immediate investigation needed
  - **Medium**: Suspicious activity, requires further analysis
  - **Low**: Likely benign, monitor for recurrence
- Recommend response actions (isolate host, block hash, escalate to IR team, close as false positive)

## Output Format
Structure findings as:
1. Alert Summary (one paragraph)
2. Key Indicators (bullet list)
3. Risk Assessment (severity + confidence)
4. Recommended Actions (prioritized list)`,
  getAllowedTools: () => ['security.alerts'],
  getInlineTools: () => [
    {
      id: 'security.alert-triage.fetch-alert',
      type: ToolType.builtin,
      description: 'Fetch full alert details by alert ID including detection rule and entities',
      schema: z.object({
        alertId: z.string().describe('The alert ID to fetch'),
      }),
      handler: async () => {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: JSON.stringify(
                  {
                    _id: 'abc123def456',
                    _index: '.internal.alerts-security.alerts-default-000001',
                    '@timestamp': new Date().toISOString(),
                    'kibana.alert.rule.name': 'Malware Detection - Suspicious Executable',
                    'kibana.alert.severity': 'high',
                    'kibana.alert.workflow_status': 'open',
                    'kibana.alert.rule.threat': [
                      {
                        framework: 'MITRE ATT&CK',
                        tactic: { name: 'Execution', id: 'TA0002' },
                        technique: [
                          { name: 'User Execution', id: 'T1204' },
                          { name: 'Malicious File', id: 'T1204.002' },
                        ],
                      },
                    ],
                    'host.name': 'WORKSTATION-042',
                    'host.os.name': 'Windows',
                    'user.name': 'jsmith',
                    'process.name': 'update_helper.exe',
                    'process.hash.sha256':
                      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                    'file.path': 'C:\\Users\\jsmith\\Downloads\\update_helper.exe',
                    message:
                      'Suspicious executable detected with known malware signature pattern',
                  },
                  null,
                  2
                ),
              },
            },
          ],
        };
      },
    },
  ],
});
