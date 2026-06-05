/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface TechnologyMapping {
  keywords: string[];
  expectedIndexPrefixes: string[];
}

/**
 * Maps detection-request keywords to the index prefixes that actually contain
 * the relevant telemetry.  Used by the lightweight pre-generation gate to
 * decide whether a strict refusal instruction should be injected for the
 * current turn.
 */
const TECHNOLOGY_INDEX_MAP: TechnologyMapping[] = [
  {
    keywords: ['powershell', 'script_block', 'scriptblock', 'encoded command', 'invoke-expression'],
    expectedIndexPrefixes: ['logs-windows.powershell', 'logs-endpoint.events.process', 'logs-endpoint.events.file', 'logs-sysmon'],
  },
  {
    keywords: ['okta', 'mfa', 'multi-factor', 'push notification', 'session hijacking', 'authentication context'],
    expectedIndexPrefixes: ['logs-okta.system'],
  },
  {
    keywords: ['fortinet', 'fortigate', 'firewall'],
    expectedIndexPrefixes: ['logs-fortinet.firewall'],
  },
  {
    keywords: ['palo alto', 'panw', 'xdr', 'globalprotect', 'panorama'],
    expectedIndexPrefixes: ['logs-panw.panos'],
  },
  {
    keywords: ['azure', 'entra', 'microsoft 365', 'intune', 'conditional access'],
    expectedIndexPrefixes: ['logs-azure', 'logs-o365'],
  },
  {
    keywords: ['aws', 'cloudtrail', 's3', 'iam', 'ec2', 'lambda', 'rds'],
    expectedIndexPrefixes: ['logs-aws'],
  },
  {
    keywords: ['gcp', 'google cloud', 'bigquery', 'gke'],
    expectedIndexPrefixes: ['logs-gcp'],
  },
  {
    keywords: ['google workspace', 'gsuite', 'gmail', 'google admin'],
    expectedIndexPrefixes: ['logs-google_workspace'],
  },
  {
    keywords: ['threat intel', 'threat-intel', 'ioc', 'indicator of compromise', 'ti_abusech', 'ti_recordedfuture'],
    expectedIndexPrefixes: ['logs-ti'],
  },
  {
    keywords: ['network traffic', 'network flow', 'netflow', 'packetbeat'],
    expectedIndexPrefixes: ['logs-network_traffic'],
  },
  {
    keywords: ['windows', 'sysmon', 'event.code', 'uac', 'mmc.exe'],
    expectedIndexPrefixes: ['logs-windows', 'logs-endpoint.events', 'logs-sysmon'],
  },
  {
    keywords: ['linux', 'auditd', 'selinux', 'pam'],
    expectedIndexPrefixes: ['logs-endpoint.events', 'logs-auditd'],
  },
  {
    keywords: ['macos', 'mac os', 'plist', 'loginwindow', 'launchd'],
    expectedIndexPrefixes: ['logs-endpoint.events'],
  },
  {
    keywords: ['kubernetes', 'k8s', 'container', 'pod', 'privileged container', 'container escape'],
    expectedIndexPrefixes: ['logs-kubernetes', 'logs-endpoint.events'],
  },
  {
    keywords: ['office 365', 'o365', 'exchange', 'sharepoint', 'onedrive', 'teams'],
    expectedIndexPrefixes: ['logs-o365'],
  },
];

/**
 * Extract available index prefixes from the prompt string.
 * Handles patterns like "Available data: logs-endpoint.events.*"
 */
function extractAvailablePrefixes(userQuery: string): string[] {
  const match = userQuery.match(/Available data:\s*([^\n]+)/i);
  if (!match) return [];

  return match[1]
    .split(/,| and /i)
    .map((s) => s.trim().toLowerCase().replace(/\*+$/, ''))
    .filter(Boolean);
}

/**
 * Lightweight gate that checks whether the user request references a specific
 * technology whose expected index prefixes are NOT present in the available
 * data.
 *
 * Returns a refusal reason string when a clear mismatch is detected,
 * otherwise `null` (no mismatch, proceed normally).
 */
export function detectDataSourceMismatch(userQuery: string): string | null {
  const available = extractAvailablePrefixes(userQuery);
  if (available.length === 0) return null;

  const lowerQuery = userQuery.toLowerCase();

  for (const tech of TECHNOLOGY_INDEX_MAP) {
    const requestMatchesTech = tech.keywords.some((kw) => lowerQuery.includes(kw.toLowerCase()));
    if (!requestMatchesTech) continue;

    const hasExpectedIndex = tech.expectedIndexPrefixes.some((prefix) =>
      available.some((a) => a.startsWith(prefix) || prefix.startsWith(a))
    );

    if (!hasExpectedIndex) {
      return `The requested detection (${tech.keywords[0]}) requires data from ${tech.expectedIndexPrefixes.join(' / ')}, but the available data only includes ${available.join(' / ')}.`;
    }
  }

  return null;
}
