/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'securityPlayground';
export const SPACE_ID = 'sample-playground';
export const SPACE_NAME = 'Security Sample Playground';
export const SAMPLE_TAG = 'elastic-security-sample-data';

export const PROVISION_ROUTE = '/internal/security_playground/provision' as const;

// Pinned rule UUIDs — deterministic so alert "kibana.alert.rule.uuid" links resolve on re-provision.
// Must be valid UUIDs (hex only, correct segment lengths); Kibana validates strictly.
export const PINNED_RULE_IDS = {
  MACRO_EXEC: '00000000-0000-4000-8000-000000000001',
  C2_BEACON: '00000000-0000-4000-8000-000000000002',
  DOMAIN_ENUM: '00000000-0000-4000-8000-000000000003',
  CRED_DUMP: '00000000-0000-4000-8000-000000000004',
  MASS_ENCRYPT: '00000000-0000-4000-8000-000000000005',
  VSS_DELETE: '00000000-0000-4000-8000-000000000006',
  LATERAL_MOVE: '00000000-0000-4000-8000-000000000007',
} as const;

// Human-readable kill-chain phases surfaced in the streaming progress feed.
export const KILL_CHAIN_PHASES = [
  {
    phase: 'initial-access',
    story: 'Phishing email arrives → user opens macro-enabled document (OUTLOOK → WINWORD)',
  },
  {
    phase: 'execution',
    story:
      'WINWORD spawns cmd.exe → certutil downloads payload → rundll32 loads Cobalt Strike beacon',
  },
  {
    phase: 'c2',
    story: 'Periodic HTTPS beacons from rundll32 to attacker C2 (443/8443)',
  },
  {
    phase: 'lateral-movement',
    story: 'PowerShell enumerates domain → PsExec pivots to SRV-FILE01, SRV-DC01, SRV-SQL01',
  },
  {
    phase: 'credential-access',
    story: 'Mimikatz runs on SRV-DC01 — LSASS credential extraction',
  },
  {
    phase: 'impact',
    story:
      'Shadow copies deleted (vssadmin), mass file encryption (.locked) on Finance/HR/Engineering shares',
  },
] as const;
