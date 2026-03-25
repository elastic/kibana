/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../evaluate';

/**
 * Investigator Agent eval suite.
 *
 * Validates that the investigator agent:
 *  - Produces a timeline with chronological events for a true positive alert
 *  - Identifies affected entities (hosts, users)
 *  - Identifies the attack vector
 *  - Produces a root cause hypothesis with confidence
 *  - Creates or references a case for tracking
 */
evaluate.describe('Investigator Agent', { tag: tags.serverless.security.complete }, () => {
  evaluate(
    'true positive alert produces timeline with chronological events',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'investigator-agent: timeline-reconstruction',
          description:
            'Validates the investigator agent produces a chronological timeline of events when investigating a confirmed true positive alert.',
          examples: [
            {
              input: {
                question:
                  'Investigate the following confirmed true positive alert: A Cobalt Strike beacon was detected on host "ws-finance-03" at 2024-03-15T14:23:00Z. The triage agent classified this as true_positive with confidence 0.92. The beacon was communicating with C2 server 185.220.101.42 over HTTPS. The affected user is "jdoe" who logged in at 2024-03-15T09:01:00Z. Prior to the beacon detection, there was a suspicious email attachment opened at 2024-03-15T13:45:00Z and a PowerShell download cradle executed at 2024-03-15T14:15:00Z. Reconstruct the full timeline of this incident.',
              },
              output: {
                criteria: [
                  'The response MUST include a "Timeline of Events" section with events ordered chronologically',
                  'The timeline MUST include at least 3 distinct timestamped events (e.g., email attachment opened, PowerShell execution, beacon detection)',
                  'Each timeline entry MUST include a timestamp, event description, and the entity or data source involved',
                  'The timeline MUST span from the initial access (email attachment at 13:45) through to the beacon detection (14:23)',
                  'The timeline MUST identify the progression of the attack chain (initial access -> execution -> command and control)',
                ],
                toolCalls: [
                  {
                    id: 'security.alerts',
                    criteria: [
                      'The alerts tool should be called to retrieve all alerts related to host ws-finance-03 and/or user jdoe within the investigation time window',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Investigation' },
            },
          ],
        },
      });
    }
  );

  evaluate('identifies affected entities (hosts, users)', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'investigator-agent: entity-identification',
        description:
          'Validates the investigator agent correctly identifies all affected entities including hosts, users, and external infrastructure involved in the incident.',
        examples: [
          {
            input: {
              question:
                'Investigate a lateral movement incident: An alert for "Suspicious Lateral Movement via PsExec" was triggered on host "dc-prod-01" at 2024-03-16T02:30:00Z. The source host is "ws-finance-03" (previously compromised) and the actor is user "admin-jsmith" whose credentials were likely stolen. Additional network connections were observed from "ws-finance-03" to hosts "db-prod-01" and "app-server-02" over SMB (port 445). Identify all affected entities in this incident.',
            },
            output: {
              criteria: [
                'The response MUST include an "Affected Entities" section listing all identified hosts and users',
                'The affected hosts MUST include at minimum: ws-finance-03 (source/compromised), dc-prod-01 (target), db-prod-01, and app-server-02',
                'The affected users MUST include at minimum: admin-jsmith (compromised credentials)',
                'Each entity MUST include a status or role description (e.g., "source of lateral movement", "target", "compromised credentials")',
                'The response MUST distinguish between confirmed-compromised entities and potentially-affected entities',
              ],
              toolCalls: [
                {
                  id: 'security.entity_risk_score',
                  criteria: [
                    'The entity risk score tool should be called to check risk profiles of the involved hosts and/or users',
                  ],
                },
                {
                  id: 'security.alerts',
                  criteria: [
                    'The alerts tool should be called to find related alerts across the affected hosts',
                  ],
                },
              ],
            },
            metadata: { query_intent: 'Investigation' },
          },
        ],
      },
    });
  });

  evaluate('identifies attack vector', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'investigator-agent: attack-vector-identification',
        description:
          'Validates the investigator agent correctly identifies the initial access vector and attack technique used.',
        examples: [
          {
            input: {
              question:
                'Investigate the initial access vector for the following incident: Host "ws-hr-07" triggered a "Ransomware File Encryption Detected" alert at 2024-03-17T16:00:00Z. Earlier alerts on the same host include: "Suspicious Macro Execution in Office Document" at 2024-03-17T10:15:00Z triggered by user "hr-analyst" opening "Q1_Benefits_Update.docm" received via email from "benefits@hr-portal-update.com", "Encoded PowerShell Command Execution" at 2024-03-17T10:17:00Z, and "Suspicious DLL Sideloading" at 2024-03-17T10:25:00Z. The email domain "hr-portal-update.com" was registered 3 days ago. Determine the attack vector.',
            },
            output: {
              criteria: [
                'The response MUST identify the initial access vector as a phishing email with a malicious macro-enabled Office document',
                'The response MUST mention the suspicious email domain "hr-portal-update.com" and note that it was recently registered (a phishing indicator)',
                'The response MUST map the attack progression through the kill chain: phishing (initial access) -> macro execution (execution) -> PowerShell (execution/download) -> DLL sideloading (persistence/defense evasion) -> ransomware (impact)',
                'The response MUST reference relevant MITRE ATT&CK techniques (e.g., T1566.001 Spearphishing Attachment, T1059.001 PowerShell)',
                'The response MUST include an "Initial Access Vector" or "Root Cause" section clearly stating the finding',
              ],
              toolCalls: [
                {
                  id: 'security.alerts',
                  criteria: [
                    'The alerts tool should be called to retrieve the full chain of alerts on host ws-hr-07',
                  ],
                },
                {
                  id: 'security.threat_intel_enrich',
                  criteria: [
                    'The threat intelligence tool should be called to check the suspicious email domain or other indicators',
                  ],
                },
              ],
            },
            metadata: { query_intent: 'Investigation' },
          },
        ],
      },
    });
  });

  evaluate('produces root cause hypothesis with confidence', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'investigator-agent: root-cause-hypothesis',
        description:
          'Validates the investigator agent produces a root cause hypothesis with a stated level of confidence and supporting evidence.',
        examples: [
          {
            input: {
              question:
                'Investigate the root cause of this incident: Multiple hosts in the engineering subnet (10.0.20.0/24) simultaneously triggered "Cryptocurrency Mining Activity Detected" alerts at 2024-03-18T03:00:00Z. The affected hosts are: eng-build-01, eng-build-02, eng-build-03, and eng-ci-runner-01. All hosts are running a Jenkins CI/CD pipeline. The mining process was spawned as a child of the Jenkins agent process. A new Jenkins plugin "performance-optimizer-v2.1" was installed by user "devops-lead" at 2024-03-17T22:00:00Z. The plugin was downloaded from an unofficial repository. No other hosts outside the engineering subnet are affected. Determine the root cause.',
            },
            output: {
              criteria: [
                'The response MUST include a "Root Cause" section with a clearly stated hypothesis',
                'The root cause hypothesis MUST identify the malicious Jenkins plugin ("performance-optimizer-v2.1") installed from an unofficial repository as the likely initial cause',
                'The response MUST include a confidence level or certainty assessment for the root cause hypothesis (e.g., "high confidence", a numeric score, or equivalent)',
                'The response MUST list supporting evidence for the hypothesis (timing correlation between plugin install and mining activity, all affected hosts running Jenkins, mining process spawned by Jenkins agent)',
                'The response MUST identify contributing factors such as: the use of an unofficial plugin repository, insufficient plugin vetting, and the devops-lead account having install privileges',
              ],
              toolCalls: [
                {
                  id: 'security.alerts',
                  criteria: [
                    'The alerts tool should be called to retrieve cryptocurrency mining alerts across the affected hosts',
                  ],
                },
              ],
            },
            metadata: { query_intent: 'Investigation' },
          },
        ],
      },
    });
  });

  evaluate('creates or references a case for tracking', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'investigator-agent: case-management',
        description:
          'Validates the investigator agent creates or references a case for tracking the investigation, including attaching findings and IOCs.',
        examples: [
          {
            input: {
              question:
                'Investigate and create a case for the following incident: A confirmed data exfiltration incident was detected on host "db-prod-01". Alerts include: "Unusual Large Data Transfer" at 2024-03-19T01:00:00Z showing 4.2GB transferred to external IP 198.51.100.15 over DNS tunneling, "Suspicious DNS Query Pattern" at 2024-03-19T00:45:00Z with encoded payloads in DNS TXT queries to "exfil.data-analytics-cdn.net", and "Credential Access via LSASS Memory Dump" at 2024-03-18T23:30:00Z on the same host. The affected user is "db-admin" and the host contains PII data for approximately 50,000 customer records. This requires immediate case creation for tracking and cross-team coordination.',
            },
            output: {
              criteria: [
                'The response MUST indicate creation of a case or explicit recommendation to create a case for tracking this incident',
                'The case details MUST include: a descriptive title, severity (critical or high given the data exfiltration of PII), and assignment recommendation',
                'The response MUST include IOCs discovered during the investigation (e.g., external IP 198.51.100.15, domain exfil.data-analytics-cdn.net)',
                'The response MUST attach or reference the investigation timeline and affected entity list within the case',
                'The response MUST include immediate containment recommendations (e.g., isolate host, block external IP/domain, reset db-admin credentials)',
              ],
              toolCalls: [
                {
                  id: 'security.case_manage',
                  criteria: [
                    'The case management tool should be called to create a new case or reference an existing case for this investigation',
                  ],
                },
                {
                  id: 'security.alerts',
                  criteria: [
                    'The alerts tool should be called to retrieve the data exfiltration and related alerts',
                  ],
                },
              ],
            },
            metadata: { query_intent: 'Investigation' },
          },
        ],
      },
    });
  });
});
