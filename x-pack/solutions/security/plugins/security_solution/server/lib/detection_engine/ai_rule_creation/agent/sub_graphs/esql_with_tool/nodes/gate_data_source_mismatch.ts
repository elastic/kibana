/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Terms that appear in nearly every detection request and should not be
 * treated as meaningful overlap.
 */
const STOPWORDS = new Set([
  'detect',
  'detection',
  'detections',
  'rule',
  'rules',
  'alert',
  'alerts',
  'attack',
  'threat',
  'anomaly',
  'suspicious',
  'malicious',
  'indicator',
  'behavior',
  'activity',
  'events',
  'event',
  'log',
  'logs',
  'query',
  'monitor',
  'monitoring',
  'observed',
  'create',
  'creation',
  'generate',
  'generating',
  'identify',
  'identifying',
  'find',
  'finding',
  'look',
  'looking',
  'search',
  'searching',
  'when',
  'where',
  'how',
  'what',
  'which',
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'can',
  'shall',
  'need',
  'used',
  'using',
  'use',
  'via',
  'from',
  'for',
  'with',
  'by',
  'to',
  'of',
  'in',
  'on',
  'at',
  'as',
  'or',
  'and',
  'but',
  'not',
  'no',
  'that',
  'this',
  'these',
  'those',
  'it',
  'its',
  'they',
  'them',
  'their',
  'we',
  'our',
  'you',
  'your',
  'i',
  'my',
  'me',
]);

/**
 * Lightweight synonym map so that a request mentioning a vendor-specific
 * product still matches the broader integration family.
 *
 * Keys are request-side terms; values are integration-side keywords that
 * should also be considered a match.
 */
const REQUEST_SYNONYMS: Record<string, string[]> = {
  powershell: ['windows'],
  sysmon: ['windows'],
  uac: ['windows'],
  mfa: ['okta', 'auth', 'authentication'],
  'multi-factor': ['okta', 'auth', 'authentication'],
  'multi factor': ['okta', 'auth', 'authentication'],
  gmail: ['google_workspace', 'google'],
  gsuite: ['google_workspace', 'google'],
  'google cloud': ['gcp'],
  firewall: ['panw', 'fortinet'],
  vpn: ['panw', 'globalprotect'],
  brute: ['security'],
  brute_force: ['security'],
  'brute force': ['security'],
  abusech: ['ti_abusech'],
  'recorded future': ['ti_recordedfuture'],
  malware: ['endpoint'],
  ransomware: ['endpoint'],
  credential: ['endpoint'],
  kerberoast: ['endpoint'],
  kerberoasting: ['endpoint'],
  dcsync: ['endpoint', 'windows'],
  'privilege escalation': ['endpoint', 'windows'],
};

/**
 * Category synonyms that expand integration keywords into broader security
 * concepts.  This bridges the vocabulary gap where a user describes an
 * attack technique (e.g. "UAC bypass") but the index pattern only exposes
 * the integration name ("endpoint").
 *
 * Applied to the *allowed* keyword set so the overlap check works
 * bidirectionally.
 */
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  endpoint: [
    'windows',
    'sysmon',
    'powershell',
    'uac',
    'credential',
    'malware',
    'ransomware',
    'privilege',
    'dcsync',
    'kerberoast',
  ],
  windows: ['sysmon', 'powershell', 'uac', 'mmc', 'credential', 'process'],
  sysmon: ['windows', 'endpoint', 'process'],
  aws: ['cloudtrail', 's3', 'ec2', 'iam', 'lambda', 'rds'],
  gcp: ['bigquery', 'gke', 'cloud', 'google', 'iam'],
  google_workspace: ['gmail', 'gsuite', 'google', 'admin'],
  okta: ['auth', 'mfa', 'authentication', 'sso'],
  kubernetes: ['container', 'pod', 'k8s', 'escape', 'privilege'],
  panw: ['firewall', 'vpn', 'globalprotect', 'network'],
  fortinet: ['firewall', 'vpn', 'network'],
  ti_abusech: ['threat', 'intel', 'ioc', 'indicator'],
  ti_recordedfuture: ['threat', 'intel', 'ioc', 'indicator'],
  network_traffic: ['netflow', 'packetbeat', '流量', 'flow'],
  azure: ['entra', 'o365', 'office365', 'microsoft', 'conditional'],
};

/**
 * Extract meaningful keywords from an index pattern string.
 *
 *   "logs-okta.system-default"     → {"okta", "system"}
 *   "logs-aws.cloudtrail-*"        → {"aws", "cloudtrail"}
 *   "logs-endpoint.events.process" → {"endpoint", "events", "process"}
 *   "logs-ti_abusech.malware-*"    → {"ti_abusech", "malware"}
 */
function extractIndexKeywords(indexPattern: string): Set<string> {
  const keywords = new Set<string>();

  // Strip common prefixes/suffixes
  const cleaned = indexPattern
    .replace(/^logs-/, '')
    .replace(/[\-*]+$/, '')
    .replace(/-default$/, '');

  // Split on delimiters used in integration naming
  const parts = cleaned.split(/[._]+/);
  for (const part of parts) {
    const lower = part.toLowerCase().trim();
    if (lower.length > 1 && !STOPWORDS.has(lower)) {
      keywords.add(lower);
    }
  }

  return keywords;
}

/**
 * Extract available index patterns from the prompt string.
 */
function extractAvailablePrefixes(userQuery: string): string[] {
  const match = userQuery.match(/Available data:\s*([^\n]+)/i);
  if (!match) return [];

  return match[1]
    .split(/,|\s+and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Split the prompt into the user's request and the available-data line.
 */
function splitPrompt(userQuery: string): { request: string; availableLine: string | null } {
  const lines = userQuery.split('\n');
  const requestLines: string[] = [];
  let availableLine: string | null = null;

  for (const line of lines) {
    if (/^Available data:/i.test(line.trim())) {
      availableLine = line.trim();
    } else {
      requestLines.push(line);
    }
  }

  return { request: requestLines.join('\n'), availableLine };
}

/**
 * Strip trailing qualifier phrases from the request that describe the
 * available data source (e.g. "using only network traffic logs").  These
 * phrases inject the available-data keywords back into the request tokens
 * and create false overlap.
 */
function stripQualifiers(request: string): string {
  return request
    .replace(/\s+using only\b[\s\S]*?$/i, '')
    .replace(/\s+via\b[\s\S]*?$/i, '')
    .replace(/\s+from\b[\s\S]*?\b(logs?|data)\b[\s\S]*?$/i, '');
}

/**
 * Tokenise the user request into candidate keywords.
 */
function tokenizeRequest(request: string): Set<string> {
  const tokens = new Set<string>();
  const lower = request.toLowerCase();

  // Split on whitespace and common delimiters
  const parts = lower.split(/[^a-z0-9_]+/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length > 1 && !STOPWORDS.has(trimmed)) {
      tokens.add(trimmed);
    }
  }

  // Add request-side synonym expansions
  for (const token of tokens) {
    const expansions = REQUEST_SYNONYMS[token];
    if (expansions) {
      expansions.forEach((e) => tokens.add(e));
    }
  }
  // Also check multi-word request synonyms
  for (const [phrase, expansions] of Object.entries(REQUEST_SYNONYMS)) {
    if (phrase.includes(' ') && lower.includes(phrase)) {
      expansions.forEach((e) => tokens.add(e));
    }
  }

  return tokens;
}

/**
 * Generic data-source mismatch gate.
 *
 * Derives allowed keywords from the *actual* available index patterns
 * instead of a hard-coded technology map.  This means the gate
 * automatically works for any integration the cluster has data for,
 * without manual keyword curation.
 *
 * Returns a refusal reason when the user request references technology
 * that is absent from the available data, otherwise `null`.
 */
export function detectDataSourceMismatch(userQuery: string): string | null {
  const { request, availableLine } = splitPrompt(userQuery);
  if (!availableLine) return null;

  const strippedRequest = stripQualifiers(request);

  const availableIndices = availableLine
    .replace(/^Available data:\s*/i, '')
    .split(/,|\s+and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  if (availableIndices.length === 0) return null;

  // Build allowed-keyword set from available index patterns
  const allowed = new Set<string>();
  for (const idx of availableIndices) {
    extractIndexKeywords(idx).forEach((k) => allowed.add(k));
  }

  // Expand allowed keywords with category synonyms so that a user
  // describing an attack technique (e.g. "UAC bypass") still matches
  // the broader integration (e.g. "endpoint" / "windows").
  for (const keyword of [...allowed]) {
    const expansions = CATEGORY_SYNONYMS[keyword];
    if (expansions) {
      expansions.forEach((e) => allowed.add(e));
    }
  }

  const requestTokens = tokenizeRequest(strippedRequest);

  // Compute overlap between request tokens and allowed integration keywords
  const overlap: string[] = [];
  for (const token of requestTokens) {
    for (const allowedKw of allowed) {
      // Bidirectional prefix match handles wildcards gracefully:
      //   "endpoint"  matches "logs-endpoint.events.*"
      //   "powershell" matches "logs-windows.powershell_operational"
      if (token === allowedKw || token.startsWith(allowedKw) || allowedKw.startsWith(token)) {
        overlap.push(token);
        break;
      }
    }
  }

  if (overlap.length === 0) {
    const availableStr = availableIndices.join(', ');
    return (
      `The requested detection is not supported by the available data sources. ` +
      `Available data: ${availableStr}.`
    );
  }

  return null;
}
