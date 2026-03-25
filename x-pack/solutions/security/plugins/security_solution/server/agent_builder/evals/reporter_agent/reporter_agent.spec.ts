/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../evaluate';

/**
 * Reporter Agent eval suite.
 *
 * Validates that the reporter agent:
 *  - Generates an executive summary section
 *  - Generates a technical timeline section
 *  - Includes MITRE ATT&CK mapping in the report
 *  - Includes impact assessment with affected entities count
 *  - Creates a case and attaches the report
 */
evaluate.describe('Reporter Agent', { tag: tags.serverless.security.complete }, () => {
  evaluate('should generate executive summary section', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'reporter-agent: executive-summary',
        description:
          'Validates the reporter agent generates a well-structured executive summary section suitable for non-technical stakeholders.',
        examples: [
          {
            input: {
              question:
                'Generate an incident report for the following completed investigation: A targeted phishing campaign delivered a Cobalt Strike beacon to 3 hosts in the Finance department on 2024-03-15. The attacker gained domain admin credentials and exfiltrated 2.1GB of financial records to an external server in Eastern Europe. The incident was contained within 4 hours of initial detection. All compromised hosts have been isolated, credentials rotated, and C2 infrastructure blocked. No evidence of data manipulation was found. Generate the executive summary section of the report.',
            },
            output: {
              criteria: [
                'The response MUST include an "Executive Summary" section clearly labeled as such',
                'The executive summary MUST describe the incident type (targeted phishing campaign leading to data exfiltration) in business-friendly language',
                'The executive summary MUST include the scope of impact (3 hosts, Finance department, 2.1GB data exfiltrated)',
                'The executive summary MUST include the resolution status (contained within 4 hours, hosts isolated, credentials rotated)',
                'The executive summary MUST be concise (no more than 2-3 paragraphs) and avoid deeply technical jargon',
              ],
              toolCalls: [
                {
                  id: 'security.report_generate',
                  criteria: [
                    'The report generation tool should be called to produce the structured report with the executive summary section',
                  ],
                },
              ],
            },
            metadata: { query_intent: 'Report' },
          },
        ],
      },
    });
  });

  evaluate('should generate technical timeline section', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'reporter-agent: technical-timeline',
        description:
          'Validates the reporter agent generates a detailed technical timeline section with chronological events.',
        examples: [
          {
            input: {
              question:
                'Generate an incident report timeline section for the following events: 2024-03-15T08:00:00Z - Phishing email delivered to user "jdoe@corp.com" with malicious Word attachment. 2024-03-15T08:15:00Z - User opened attachment, macro executed, powershell.exe spawned. 2024-03-15T08:17:00Z - Cobalt Strike beacon downloaded from evil-cdn.com/payload.bin. 2024-03-15T08:20:00Z - Persistence established via scheduled task "WindowsUpdate". 2024-03-15T08:45:00Z - LSASS memory dumped, domain admin credentials obtained. 2024-03-15T09:00:00Z - Lateral movement to "file-server-01" and "dc-prod-01" via PsExec. 2024-03-15T09:30:00Z - Data staging began on "file-server-01", compressing financial records. 2024-03-15T10:00:00Z - 2.1GB exfiltrated to 203.0.113.50 via HTTPS. 2024-03-15T12:00:00Z - SOC analyst detected anomalous outbound traffic. 2024-03-15T12:15:00Z - Incident response initiated, compromised hosts isolated.',
            },
            output: {
              criteria: [
                'The response MUST include a "Timeline" section with events listed in chronological order',
                'The timeline MUST include timestamps for each event (matching or derived from the provided timestamps)',
                'The timeline MUST cover the full attack lifecycle from initial access (phishing) through containment (isolation)',
                'The timeline MUST include at least 8 distinct events from the provided sequence',
                'The timeline MUST clearly distinguish between attacker actions and defender/SOC response actions',
              ],
              toolCalls: [
                {
                  id: 'security.report_generate',
                  criteria: [
                    'The report generation tool should be called to produce the structured report with the timeline section',
                  ],
                },
              ],
            },
            metadata: { query_intent: 'Report' },
          },
        ],
      },
    });
  });

  evaluate('should include MITRE ATT&CK mapping in report', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'reporter-agent: mitre-attack-mapping',
        description:
          'Validates the reporter agent includes MITRE ATT&CK technique and tactic mappings in the incident report.',
        examples: [
          {
            input: {
              question:
                'Generate a report that includes MITRE ATT&CK mapping for the following incident: The attacker used spear-phishing (email with malicious attachment) for initial access, executed malicious macros and PowerShell for execution, created a scheduled task for persistence, dumped LSASS credentials for credential access, used PsExec for lateral movement, staged and compressed data for collection, and exfiltrated via HTTPS for exfiltration. Map each phase to the appropriate MITRE ATT&CK technique and tactic.',
            },
            output: {
              criteria: [
                'The response MUST include a "MITRE ATT&CK Mapping" section in the report',
                'The mapping MUST include at least 5 distinct MITRE ATT&CK techniques with their IDs (e.g., T1566, T1059, T1053)',
                'Each technique MUST be associated with the correct MITRE ATT&CK tactic (e.g., Initial Access, Execution, Persistence)',
                'The mapping MUST cover techniques from at least 4 different tactics to represent the full attack chain',
                'The techniques MUST be contextually accurate for the described attacker activities',
              ],
              toolCalls: [
                {
                  id: 'security.report_generate',
                  criteria: [
                    'The report generation tool should be called to produce the structured report with the MITRE ATT&CK mapping section',
                  ],
                },
              ],
            },
            metadata: { query_intent: 'Report' },
          },
        ],
      },
    });
  });

  evaluate(
    'should include impact assessment with affected entities count',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'reporter-agent: impact-assessment',
          description:
            'Validates the reporter agent includes an impact assessment section with quantified affected entities.',
          examples: [
            {
              input: {
                question:
                  'Generate a report impact assessment for the following incident: 5 hosts were compromised (web-prod-01, web-prod-02, db-prod-03, app-prod-04, file-server-01). 3 user accounts were involved (admin-jsmith with domain admin privileges, svc-deploy service account, user-mwilson standard user). 2 departments affected (Engineering and Finance). 2.1GB of data exfiltrated consisting of financial projections and source code repositories. The incident caused 6 hours of downtime for the customer portal (web-prod-01, web-prod-02). Estimated revenue impact is $150,000 from downtime. No customer PII was confirmed exfiltrated.',
              },
              output: {
                criteria: [
                  'The response MUST include an "Impact Assessment" section in the report',
                  'The impact assessment MUST quantify affected hosts (5 hosts with names listed)',
                  'The impact assessment MUST quantify affected user accounts (3 accounts with privilege levels)',
                  'The impact assessment MUST quantify data exfiltration volume (2.1GB) and describe the types of data affected',
                  'The impact assessment MUST include business impact metrics (6 hours downtime, $150,000 revenue impact, affected departments)',
                ],
                toolCalls: [
                  {
                    id: 'security.report_generate',
                    criteria: [
                      'The report generation tool should be called to produce the structured report with the impact assessment section',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Report' },
            },
          ],
        },
      });
    }
  );

  evaluate('should create a case and attach the report', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'reporter-agent: case-creation-and-attachment',
        description:
          'Validates the reporter agent creates a case in Elastic Security and attaches the generated report.',
        examples: [
          {
            input: {
              question:
                'Generate a full incident report for the Cobalt Strike campaign incident (IR-2024-0315) and create a case in Elastic Security to track it. The incident involved 3 compromised hosts in the Finance department, domain admin credential theft, and 2.1GB data exfiltration. Severity is critical. The report should be attached to the case as a comment. Tag the case with "incident-response", "data-exfiltration", and "cobalt-strike".',
            },
            output: {
              criteria: [
                'The response MUST create a case via the case management tool with a descriptive title referencing the incident',
                'The case MUST be created with severity "critical"',
                'The case MUST be tagged with the specified tags ("incident-response", "data-exfiltration", "cobalt-strike")',
                'The response MUST generate a report and attach it to the case as a comment',
                'The response MUST return the case ID and URL for reference',
              ],
              toolCalls: [
                {
                  id: 'security.report_generate',
                  criteria: [
                    'The report generation tool should be called to generate the structured incident report',
                  ],
                },
                {
                  id: 'security.case_manage',
                  criteria: [
                    'The case management tool should be called to create a new case and attach the report',
                  ],
                },
              ],
            },
            metadata: { query_intent: 'Report' },
          },
        ],
      },
    });
  });
});
