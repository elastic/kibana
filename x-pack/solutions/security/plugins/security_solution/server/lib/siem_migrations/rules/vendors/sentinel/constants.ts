/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { TACTICS_BASE_URL, TECHNIQUES_BASE_URL } from '../qradar/constants';

/**
 * Map of Sentinel tactic display names to MITRE ATT&CK tactic IDs.
 * Sentinel exports use human-readable names (e.g. "InitialAccess") rather than IDs (e.g. "TA0001").
 */
export const SENTINEL_TACTIC_NAME_TO_ID: Record<string, string> = {
  Reconnaissance: 'TA0043',
  ResourceDevelopment: 'TA0042',
  InitialAccess: 'TA0001',
  Execution: 'TA0002',
  Persistence: 'TA0003',
  PrivilegeEscalation: 'TA0004',
  DefenseEvasion: 'TA0005',
  CredentialAccess: 'TA0006',
  Discovery: 'TA0007',
  LateralMovement: 'TA0008',
  Collection: 'TA0009',
  CommandAndControl: 'TA0011',
  Exfiltration: 'TA0010',
  Impact: 'TA0040',
  PreAttack: 'TA0043',
  ImpairProcessControl: 'TA0106',
  InhibitResponseFunction: 'TA0107',
};

/**
 * Map of Sentinel tactic display names to human-readable MITRE ATT&CK tactic names.
 */
export const SENTINEL_TACTIC_NAME_TO_DISPLAY: Record<string, string> = {
  Reconnaissance: 'Reconnaissance',
  ResourceDevelopment: 'Resource Development',
  InitialAccess: 'Initial Access',
  Execution: 'Execution',
  Persistence: 'Persistence',
  PrivilegeEscalation: 'Privilege Escalation',
  DefenseEvasion: 'Defense Evasion',
  CredentialAccess: 'Credential Access',
  Discovery: 'Discovery',
  LateralMovement: 'Lateral Movement',
  Collection: 'Collection',
  CommandAndControl: 'Command and Control',
  Exfiltration: 'Exfiltration',
  Impact: 'Impact',
  PreAttack: 'Pre-ATT&CK',
  ImpairProcessControl: 'Impair Process Control',
  InhibitResponseFunction: 'Inhibit Response Function',
};
