/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ComplianceStatus = 'RED' | 'AMBER' | 'GREEN' | 'NOT_APPLICABLE';

export interface PciRequirementDefinition {
  id: string;
  name: string;
  description: string;
  requiredFields: string[];
  recommendations: string[];
  buildEsql: (indexPattern: string, from: string, to: string) => string;
}

export const DEFAULT_PCI_INDEX_PATTERNS = [
  'logs-*',
  'metrics-*',
  'filebeat-*',
  'auditbeat-*',
  'packetbeat-*',
  'winlogbeat-*',
  'endgame-*',
] as const;

const buildBaseQuery = (
  indexPattern: string,
  from: string,
  to: string,
  extraWhere: string
): string => {
  return `FROM ${indexPattern}
| WHERE @timestamp >= "${from}" AND @timestamp <= "${to}" AND ${extraWhere}
| STATS matching_events = COUNT(*)`;
};

export const PCI_REQUIREMENTS: Record<string, PciRequirementDefinition> = {
  '1': {
    id: '1',
    name: 'Install and Maintain Network Security Controls',
    description:
      'Evaluate evidence of monitored network control activity and denied/filtered traffic.',
    requiredFields: ['event.category', 'event.type', 'source.ip', 'destination.ip', '@timestamp'],
    recommendations: [
      'Ensure network segmentation and firewall policy updates are continuously logged.',
      'Review denied network traffic trends and tune policies for high-risk paths.',
    ],
    buildEsql: (indexPattern, from, to) =>
      buildBaseQuery(indexPattern, from, to, 'event.category == "network"'),
  },
  '2': {
    id: '2',
    name: 'Apply Secure Configurations',
    description: 'Assess configuration and hardening event coverage.',
    requiredFields: ['event.category', 'event.action', 'host.name', '@timestamp'],
    recommendations: [
      'Centralize secure baseline changes and monitor drift across critical systems.',
      'Track hardening exceptions with expiration and compensating controls.',
    ],
    buildEsql: (indexPattern, from, to) =>
      buildBaseQuery(
        indexPattern,
        from,
        to,
        'event.category == "configuration" OR event.action LIKE "*config*"'
      ),
  },
  '3': {
    id: '3',
    name: 'Protect Stored Account Data',
    description: 'Validate telemetry indicating controls around sensitive data access and storage.',
    requiredFields: ['event.category', 'event.action', 'data_stream.dataset', '@timestamp'],
    recommendations: [
      'Monitor sensitive data access and verify retention/deletion controls are audited.',
      'Correlate database access telemetry with privileged identity activity.',
    ],
    buildEsql: (indexPattern, from, to) =>
      buildBaseQuery(
        indexPattern,
        from,
        to,
        'event.category == "database" OR event.action LIKE "*data*"'
      ),
  },
  '4': {
    id: '4',
    name: 'Protect Cardholder Data with Strong Cryptography During Transmission',
    description: 'Check for evidence of cryptographic telemetry in network communication events.',
    requiredFields: ['network.protocol', 'tls.version', 'tls.cipher', '@timestamp'],
    recommendations: [
      'Ensure TLS metadata is ingested and monitor weak/legacy protocol usage.',
      'Alert on unencrypted transport observed in cardholder-data paths.',
    ],
    buildEsql: (indexPattern, from, to) =>
      buildBaseQuery(
        indexPattern,
        from,
        to,
        'event.category == "network" AND (tls.version IS NOT NULL OR network.protocol IS NOT NULL)'
      ),
  },
  '5': {
    id: '5',
    name: 'Protect Systems and Networks from Malicious Software',
    description: 'Evaluate malware-related event visibility and prevention telemetry.',
    requiredFields: ['event.category', 'event.module', 'host.name', '@timestamp'],
    recommendations: [
      'Confirm endpoint telemetry for malware prevention and detection is complete.',
      'Investigate hosts repeatedly reporting malware indicators.',
    ],
    buildEsql: (indexPattern, from, to) =>
      buildBaseQuery(
        indexPattern,
        from,
        to,
        'event.category == "malware" OR event.action LIKE "*malware*"'
      ),
  },
  '6': {
    id: '6',
    name: 'Develop and Maintain Secure Systems and Software',
    description: 'Assess vulnerability and patch-related telemetry availability.',
    requiredFields: ['vulnerability.id', 'vulnerability.severity', 'host.name', '@timestamp'],
    recommendations: [
      'Track remediation SLAs for critical vulnerabilities and overdue patches.',
      'Correlate vulnerability findings with internet-facing assets.',
    ],
    buildEsql: (indexPattern, from, to) =>
      buildBaseQuery(
        indexPattern,
        from,
        to,
        'vulnerability.id IS NOT NULL OR event.action LIKE "*patch*"'
      ),
  },
  '7': {
    id: '7',
    name: 'Restrict Access by Business Need to Know',
    description: 'Check role/authorization telemetry that supports least-privilege monitoring.',
    requiredFields: ['event.category', 'user.name', 'event.outcome', '@timestamp'],
    recommendations: [
      'Review privilege grants and access exceptions for least-privilege alignment.',
      'Monitor unusual privileged access across critical systems.',
    ],
    buildEsql: (indexPattern, from, to) =>
      buildBaseQuery(
        indexPattern,
        from,
        to,
        'event.category == "iam" OR event.action LIKE "*role*" OR event.action LIKE "*privilege*"'
      ),
  },
  '8': {
    id: '8',
    name: 'Identify Users and Authenticate Access',
    description: 'Evaluate authentication telemetry quality and failed-authentication patterns.',
    requiredFields: ['event.category', 'event.outcome', 'user.name', '@timestamp'],
    recommendations: [
      'Ensure MFA-related events are ingested for interactive user authentication.',
      'Investigate concentrated failed authentication activity by user or source.',
    ],
    buildEsql: (indexPattern, from, to) =>
      buildBaseQuery(
        indexPattern,
        from,
        to,
        'event.category == "authentication" OR event.action LIKE "*login*"'
      ),
  },
  '9': {
    id: '9',
    name: 'Restrict Physical Access to Cardholder Data',
    description: 'Validate whether physical access telemetry is present for assessment.',
    requiredFields: ['event.category', 'event.action', 'host.name', '@timestamp'],
    recommendations: [
      'Integrate badge/physical access systems where available for end-to-end traceability.',
      'Document manual evidence collection for physical controls not represented in logs.',
    ],
    buildEsql: (indexPattern, from, to) =>
      buildBaseQuery(
        indexPattern,
        from,
        to,
        'event.category == "physical_access" OR event.action LIKE "*badge*"'
      ),
  },
  '10': {
    id: '10',
    name: 'Log and Monitor All Access',
    description: 'Measure breadth and continuity of audit logging and monitoring coverage.',
    requiredFields: ['event.category', 'event.module', '@timestamp'],
    recommendations: [
      'Validate audit logging across critical systems and identity providers.',
      'Monitor ingestion gaps and logging outages as priority control failures.',
    ],
    buildEsql: (indexPattern, from, to) =>
      buildBaseQuery(indexPattern, from, to, 'event.category IS NOT NULL'),
  },
  '11': {
    id: '11',
    name: 'Test Security of Systems and Networks Regularly',
    description: 'Assess evidence of testing outcomes such as intrusion and vulnerability results.',
    requiredFields: ['event.category', 'vulnerability.id', 'host.name', '@timestamp'],
    recommendations: [
      'Track recurring security test cadence and unresolved high-risk findings.',
      'Correlate intrusion alerts with control test outcomes for validation.',
    ],
    buildEsql: (indexPattern, from, to) =>
      buildBaseQuery(
        indexPattern,
        from,
        to,
        'event.category == "intrusion_detection" OR vulnerability.id IS NOT NULL'
      ),
  },
  '12': {
    id: '12',
    name: 'Support Information Security with Organizational Policies and Programs',
    description:
      'Use policy/change telemetry as supportive evidence and identify areas requiring procedural review.',
    requiredFields: ['event.category', 'event.action', 'user.name', '@timestamp'],
    recommendations: [
      'Maintain periodic policy review records and map owners to each PCI control area.',
      'Supplement telemetry-based checks with documented procedural evidence for audits.',
    ],
    buildEsql: (indexPattern, from, to) =>
      buildBaseQuery(
        indexPattern,
        from,
        to,
        'event.action LIKE "*policy*" OR event.category == "configuration"'
      ),
  },
};

export const getDefaultTimeRange = (): { from: string; to: string } => {
  const to = new Date();
  const from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
};

export const normalizeRequirementId = (requirement: string): string | null => {
  if (requirement === 'all') {
    return requirement;
  }

  const baseRequirement = requirement.split('.')[0];
  return PCI_REQUIREMENTS[baseRequirement] ? baseRequirement : null;
};

export const resolveRequirementIds = (requirements?: string[]): string[] => {
  if (!requirements || requirements.length === 0) {
    return Object.keys(PCI_REQUIREMENTS);
  }

  if (requirements.includes('all')) {
    return Object.keys(PCI_REQUIREMENTS);
  }

  return requirements;
};

export const getIndexPattern = (indices?: string[]): string => {
  const selected = indices && indices.length > 0 ? indices : [...DEFAULT_PCI_INDEX_PATTERNS];
  return selected.join(',');
};
