/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../evaluate';

/**
 * Triage Agent eval suite.
 *
 * Validates that the triage agent:
 *  - Correctly classifies alerts as true_positive, benign_true_positive, or false_positive
 *  - Returns a confidence score between 0.0 and 1.0
 *  - Provides a recommended_action field
 *  - References threat intelligence findings when applicable
 *  - Calls the expected tools during its analysis workflow
 */
evaluate.describe(
  'Triage Agent',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate(
      'critical severity alert with high entity risk returns true_positive verdict',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'triage-agent: critical-severity-high-risk',
            description:
              'Validates the triage agent classifies a critical severity alert with high entity risk as true_positive with sufficient confidence.',
            examples: [
              {
                input: {
                  question:
                    'Triage the following alert: A critical severity malware detection alert has been triggered on host "dc-prod-01" by user "admin-jsmith". The host entity risk score is 92 (critical) and the user entity risk score is 87 (high). The alert rule is "Malware Detection: Cobalt Strike Beacon Detected" with MITRE ATT&CK technique T1059.001 (PowerShell). The alert triggered at 2024-03-15T14:23:00Z and the source process is powershell.exe spawning rundll32.exe with a suspicious command line argument pointing to a DLL in a temp directory.',
                },
                output: {
                  criteria: [
                    'The verdict MUST be "true_positive" — the alert represents genuine malicious activity (Cobalt Strike beacon on a high-risk entity)',
                    'The confidence score MUST be >= 0.7, reflecting high certainty given the critical severity and high entity risk scores',
                    'The response MUST include a "Recommended Action" that specifies escalation to investigation with critical or high urgency',
                    'The response MUST reference the high entity risk scores (host risk 92, user risk 87) as corroborating evidence',
                    'The response MUST mention the MITRE ATT&CK technique (T1059.001 or PowerShell execution)',
                  ],
                  toolCalls: [
                    {
                      id: 'security.alerts',
                      criteria: [
                        'The alerts tool should be called to retrieve details about the malware detection alert',
                      ],
                    },
                    {
                      id: 'security.entity_risk_score',
                      criteria: [
                        'The entity risk score tool should be called to check risk scores for the involved host and/or user entities',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Triage' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'known-benign alert (authorized vulnerability scan) returns benign_true_positive or false_positive',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'triage-agent: known-benign-authorized-scan',
            description:
              'Validates the triage agent classifies a known-benign alert triggered by an authorized vulnerability scan as benign_true_positive or false_positive.',
            examples: [
              {
                input: {
                  question:
                    'Triage the following alert: A medium severity alert "Network Scan Detected" was triggered on host "vuln-scanner-01" by service account "svc-nessus". The source IP 10.0.50.10 is performing sequential port scanning across the 10.0.0.0/16 subnet. The host entity risk score is 12 (low) and the service account has no prior alerts. The activity matches the pattern of a Nessus vulnerability scanner. The organization runs authorized vulnerability scans every Tuesday between 02:00-06:00 UTC, and the current alert timestamp is 2024-03-19T03:15:00Z (a Tuesday).',
                },
                output: {
                  criteria: [
                    'The verdict MUST be either "benign_true_positive" or "false_positive" — the scanning activity is authorized and expected',
                    'The response MUST acknowledge that the activity matches an authorized vulnerability scanning pattern (Nessus, scheduled Tuesday window)',
                    'The response MUST include a confidence score between 0.0 and 1.0',
                    'The response MUST include a "Recommended Action" — either documenting the exception or recommending rule tuning to suppress recurring alerts from this scanner',
                    'The response MUST note the low entity risk score as supporting evidence for benign classification',
                  ],
                  toolCalls: [
                    {
                      id: 'security.alerts',
                      criteria: [
                        'The alerts tool should be called to retrieve the network scan alert details',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Triage' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'alert with matching threat intelligence references TI findings in assessment',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'triage-agent: threat-intelligence-match',
            description:
              'Validates that the triage agent references threat intelligence findings when the alert contains indicators that match known IOCs.',
            examples: [
              {
                input: {
                  question:
                    'Triage the following alert: A high severity alert "Suspicious Outbound Connection" was triggered on host "ws-finance-03" by user "jdoe". The destination IP is 185.220.101.42 and the destination domain is "c2-relay.malware-infra.net". The process making the connection is "svchost.exe" with an unusual parent process chain. The host entity risk score is 65 (high). Please check threat intelligence for the destination IP and domain, and include any TI findings in your assessment.',
                },
                output: {
                  criteria: [
                    'The response MUST reference threat intelligence findings for the destination IP (185.220.101.42) or domain (c2-relay.malware-infra.net)',
                    'The response MUST include a verdict (true_positive, benign_true_positive, or false_positive)',
                    'The response MUST include a confidence score between 0.0 and 1.0',
                    'The assessment MUST discuss whether the TI findings corroborate or contradict the alert as malicious activity',
                    'The response MUST include a "Recommended Action" field',
                  ],
                  toolCalls: [
                    {
                      id: 'security.threat_intel_enrich',
                      criteria: [
                        'The threat intelligence enrichment tool should be called to check the destination IP or domain against known IOCs',
                      ],
                    },
                    {
                      id: 'security.alerts',
                      criteria: [
                        'The alerts tool should be called to retrieve the suspicious outbound connection alert details',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Triage' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'verdict includes confidence score between 0.0 and 1.0',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'triage-agent: confidence-score-format',
            description:
              'Validates that the triage agent always includes a properly formatted confidence score in its verdict output.',
            examples: [
              {
                input: {
                  question:
                    'Triage the following alert: A low severity alert "Unusual Process Execution" was triggered on host "dev-server-12" by user "developer-1". The process is python3 executing a script from /tmp/test_exploit.py. The host entity risk score is 25 (low) and the user has no prior alerts. The script name suggests security testing but the environment is a development server.',
                },
                output: {
                  criteria: [
                    'The response MUST include a clearly labeled "Confidence" field with a numeric value between 0.0 and 1.0 (inclusive)',
                    'The confidence score MUST be expressed as a decimal number (e.g., 0.6, 0.85), not as a percentage or qualitative label',
                    'The response MUST include a verdict classification (true_positive, benign_true_positive, or false_positive)',
                    'The response MUST include a summary explanation of the reasoning behind the chosen confidence level',
                  ],
                },
                metadata: { query_intent: 'Triage' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'verdict includes recommended_action field',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'triage-agent: recommended-action-field',
            description:
              'Validates that the triage agent always includes a recommended_action field appropriate to the verdict classification.',
            examples: [
              {
                input: {
                  question:
                    'Triage the following alert: A high severity alert "Brute Force Authentication Attempt" was triggered for user "cfo-martinez" from source IP 203.0.113.50. There have been 47 failed login attempts in the last 10 minutes followed by 1 successful login. The user entity risk score is 78 (high) and the source IP is external. The successful login occurred from a geographic location inconsistent with the user\'s normal login pattern.',
                },
                output: {
                  criteria: [
                    'The response MUST include a "Recommended Action" section with specific, actionable next steps',
                    'For a true_positive verdict: the recommended action MUST include escalation to investigation and specify urgency level (critical, high, or medium)',
                    'For a benign_true_positive verdict: the recommended action MUST include documenting the exception',
                    'For a false_positive verdict: the recommended action MUST include rule tuning recommendations',
                    'The recommended action MUST be contextually appropriate to the alert — for a brute force with successful login on a high-risk user, the action should involve immediate investigation and potential credential reset',
                    'The response MUST also include a verdict and confidence score',
                  ],
                  toolCalls: [
                    {
                      id: 'security.entity_risk_score',
                      criteria: [
                        'The entity risk score tool should be called to check the risk profile of the targeted user account',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Triage' },
              },
            ],
          },
        });
      }
    );
  }
);
