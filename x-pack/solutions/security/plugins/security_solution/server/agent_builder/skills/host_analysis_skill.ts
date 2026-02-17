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
 * Stubbed host & process analysis skill for demo purposes.
 * Covers plan steps: Analyze the Affected Host & Examine Process Details.
 */
export const hostAnalysisSkill = defineSkillType({
  id: 'host-analysis',
  name: 'host-analysis',
  basePath: 'skills/security/entities',
  description:
    'Investigate a host involved in a security alert — analyze its risk score, OS details, installed agents, running processes, and process trees to identify suspicious activity.',
  content: `# Host & Process Analysis Skill

## Overview
Use this skill to deeply analyze a host and its processes during a security investigation.
Combines host metadata, risk scoring, and process tree analysis.

## Process

### 1. Host Overview
- Use \`security.host-analysis.get-host-details\` to retrieve host metadata
- Review: hostname, OS, IP addresses, agent status, risk score, asset criticality
- Check if the host is a known critical asset (e.g., domain controller, database server)

### 2. Recent Activity on Host
- Query recent alerts and events for this host within the investigation time window
- Look for unusual login patterns, privilege escalation, or service changes
- Check agent health and last check-in time

### 3. Process Tree Analysis
- Use \`security.host-analysis.get-process-tree\` to retrieve the full process tree
- Identify the malicious process, its parent, and any child processes spawned
- Look for:
  - Unusual parent-child relationships (e.g., Word spawning PowerShell)
  - Known LOLBins (Living Off the Land Binaries)
  - Processes running from suspicious paths (temp, downloads, appdata)
  - Command-line arguments indicating obfuscation or encoded payloads

### 4. Assess Host Compromise Level
- Determine if the host shows signs of active compromise vs isolated incident
- Check for persistence mechanisms installed on the host
- Evaluate whether host isolation is warranted

## Key Indicators to Look For
- Processes with unusual names or paths
- Unsigned executables or mismatched signatures
- Network connections from unexpected processes
- Registry modifications by non-admin processes
- Scheduled tasks or services created recently`,
  getAllowedTools: () => ['security.alerts'],
  getInlineTools: () => [
    {
      id: 'security.host-analysis.get-host-details',
      type: ToolType.builtin,
      description: 'Get host details including risk score, OS, agent status, and asset criticality',
      schema: z.object({
        hostName: z.string().describe('The hostname to look up'),
      }),
      handler: async () => {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: JSON.stringify(
                  {
                    host: {
                      name: 'WORKSTATION-042',
                      os: {
                        name: 'Windows 11 Enterprise',
                        version: '10.0.22631',
                      },
                      ip: ['10.0.15.42', 'fe80::1'],
                      mac: ['00:1A:2B:3C:4D:5E'],
                    },
                    agent: {
                      name: 'Elastic Agent',
                      version: '8.17.0',
                      status: 'online',
                      last_checkin: new Date().toISOString(),
                    },
                    risk: {
                      score: 72,
                      level: 'high',
                      reason: 'Multiple alerts in last 7 days',
                    },
                    asset_criticality: 'medium',
                    department: 'Engineering',
                    location: 'Building A, Floor 3',
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
    {
      id: 'security.host-analysis.get-process-tree',
      type: ToolType.builtin,
      description:
        'Get the process tree for a specific process on a host, including parent and child processes',
      schema: z.object({
        hostName: z.string().describe('The hostname'),
        processName: z.string().describe('The process name to investigate'),
      }),
      handler: async () => {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: JSON.stringify(
                  {
                    process_tree: [
                      {
                        pid: 1024,
                        name: 'explorer.exe',
                        path: 'C:\\Windows\\explorer.exe',
                        user: 'jsmith',
                        children: [
                          {
                            pid: 4892,
                            name: 'chrome.exe',
                            path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                            user: 'jsmith',
                            children: [
                              {
                                pid: 7231,
                                name: 'update_helper.exe',
                                path: 'C:\\Users\\jsmith\\Downloads\\update_helper.exe',
                                user: 'jsmith',
                                command_line:
                                  'update_helper.exe --silent --config encoded_payload_base64',
                                signed: false,
                                children: [
                                  {
                                    pid: 7450,
                                    name: 'cmd.exe',
                                    path: 'C:\\Windows\\System32\\cmd.exe',
                                    command_line:
                                      'cmd.exe /c whoami && net user && net localgroup administrators',
                                    user: 'jsmith',
                                  },
                                  {
                                    pid: 7512,
                                    name: 'powershell.exe',
                                    path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
                                    command_line:
                                      'powershell.exe -enc SQBFAFgAIAAoACgATgBlAHcALQBPAGIA...',
                                    user: 'jsmith',
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
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
