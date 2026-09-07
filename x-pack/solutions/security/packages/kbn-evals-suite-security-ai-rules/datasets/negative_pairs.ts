/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A negative test case: a prompt that should NOT produce a valid detection rule
 * given the stated available data source(s). The AI should instead explain why
 * the requested detection is not possible with the provided data.
 */
export interface NegativePair {
  id: string;
  /** The detection request presented to the AI. */
  prompt: string;
  /** The data source(s) the AI is told it must use. */
  availableData: string;
  /** Human-readable explanation of why a valid rule cannot be produced. */
  reason: string;
  metadata: { testType: 'negative'; difficulty: string };
}

/**
 * Negative test cases: prompts that should NOT produce a valid rule given
 * the stated available data. The AI is expected to refuse or explain the
 * mismatch rather than generate a syntactically valid but semantically
 * incorrect detection.
 */
export const negativePairs: NegativePair[] = [
  // Negative 1
  {
    id: 'powershell-obfuscation-network-traffic-only',
    prompt:
      'Detect PowerShell obfuscation and encoded command execution using only network traffic logs.',
    availableData: 'logs-network_traffic.*',
    reason:
      'PowerShell script block logging and command-line arguments come from Windows event logs or endpoint telemetry. Network traffic data does not contain process execution or script content.',
    metadata: { testType: 'negative', difficulty: 'medium' },
  },

  // Negative 2
  {
    id: 'okta-mfa-fatigue-endpoint-only',
    prompt:
      'Detect Okta MFA fatigue attacks and session hijacking using only Elastic Defend endpoint events.',
    availableData: 'logs-endpoint.events.*',
    reason:
      'Okta authentication events, MFA challenges, and session activity are in Okta audit logs, not endpoint telemetry. Endpoint data has no visibility into the Okta identity plane.',
    metadata: { testType: 'negative', difficulty: 'medium' },
  },

  // Negative 3
  {
    id: 'malicious-word-macros-network-flow-only',
    prompt:
      'Create a rule to detect malicious macros in Microsoft Word documents using only network flow data.',
    availableData: 'logs-network_traffic.*',
    reason:
      'Network flow data (netflow) does not contain file content or macro execution telemetry. The requested data source cannot support this detection.',
    metadata: { testType: 'negative', difficulty: 'medium' },
  },

  // Negative 4
  {
    id: 'aws-s3-policy-changes-endpoint-only',
    prompt: 'Detect AWS S3 bucket policy changes using only Elastic Defend endpoint events.',
    availableData: 'logs-endpoint.events.*',
    reason:
      'AWS S3 API activity comes from CloudTrail logs, not endpoint telemetry. The available data source does not contain AWS control plane events.',
    metadata: { testType: 'negative', difficulty: 'medium' },
  },

  // Negative 5
  {
    id: 'gcp-iam-escalation-o365-audit-only',
    prompt:
      'Detect GCP IAM role grants and privilege escalation using only Microsoft 365 audit logs.',
    availableData: 'logs-o365.audit-*',
    reason:
      'GCP IAM activity is in GCP audit logs (logs-gcp*), not O365 audit logs. O365 data has no visibility into the Google Cloud control plane.',
    metadata: { testType: 'negative', difficulty: 'medium' },
  },
];
