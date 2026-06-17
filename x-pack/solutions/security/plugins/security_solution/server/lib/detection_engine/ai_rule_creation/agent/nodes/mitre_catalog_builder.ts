/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  tactics,
  techniques,
} from '../../../../../../common/detection_engine/mitre/mitre_tactics_techniques';
import type {
  MitreTactic,
  MitreTechnique,
} from '../../../../../../common/detection_engine/mitre/types';

/**
 * Terms that appear in nearly every detection request and should not be
 * treated as meaningful keywords.
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
 * Maps query-side security keywords to relevant MITRE ATT&CK tactic IDs.
 * When a user query contains keywords matching a category, only tactics
 * relevant to that category are included in the generated catalog.
 */
const KEYWORD_TO_TACTIC_IDS: Record<string, string[]> = {
  // Windows / Endpoint / Host-based
  powershell: ['TA0002', 'TA0005', 'TA0006'],
  sysmon: ['TA0002', 'TA0004', 'TA0005', 'TA0006', 'TA0007'],
  windows: ['TA0002', 'TA0003', 'TA0004', 'TA0005', 'TA0006', 'TA0007'],
  endpoint: ['TA0002', 'TA0003', 'TA0004', 'TA0005', 'TA0006', 'TA0007'],
  uac: ['TA0004', 'TA0005'],
  privilege: ['TA0004', 'TA0005', 'TA0006'],
  dcsync: ['TA0006', 'TA0004'],
  kerberoast: ['TA0006', 'TA0004'],
  lsass: ['TA0006'],
  credential: ['TA0006', 'TA0004', 'TA0005'],
  malware: ['TA0002', 'TA0005', 'TA0040'],
  ransomware: ['TA0040', 'TA0005', 'TA0002'],
  'defense evasion': ['TA0005'],
  'privilege escalation': ['TA0004', 'TA0005'],

  // Cloud / AWS
  aws: ['TA0001', 'TA0004', 'TA0005', 'TA0011'],
  cloudtrail: ['TA0001', 'TA0004', 'TA0005', 'TA0011'],
  iam: ['TA0001', 'TA0004', 'TA0006'],
  s3: ['TA0001', 'TA0010'],
  ec2: ['TA0001', 'TA0004', 'TA0011'],
  lambda: ['TA0002', 'TA0004'],
  'amazon web services': ['TA0001', 'TA0004', 'TA0005', 'TA0011'],

  // Identity / Okta
  okta: ['TA0001', 'TA0006', 'TA0004'],
  mfa: ['TA0001', 'TA0006'],
  auth: ['TA0001', 'TA0006', 'TA0004'],
  authentication: ['TA0001', 'TA0006', 'TA0004'],
  sso: ['TA0001', 'TA0006'],

  // GCP / Google
  gcp: ['TA0001', 'TA0004', 'TA0005', 'TA0011'],
  'google cloud': ['TA0001', 'TA0004', 'TA0005', 'TA0011'],
  google_workspace: ['TA0009', 'TA0010'],
  gmail: ['TA0009', 'TA0010'],
  gsuite: ['TA0009', 'TA0010'],

  // Kubernetes / Container
  kubernetes: ['TA0002', 'TA0004', 'TA0011'],
  k8s: ['TA0002', 'TA0004', 'TA0011'],
  container: ['TA0002', 'TA0004', 'TA0011'],
  pod: ['TA0002', 'TA0004', 'TA0011'],
  escape: ['TA0004', 'TA0005'],

  // Network / Firewall / Lateral
  network: ['TA0008', 'TA0010', 'TA0011'],
  firewall: ['TA0011', 'TA0008'],
  vpn: ['TA0008', 'TA0011'],
  lateral: ['TA0008', 'TA0011'],
  'lateral movement': ['TA0008', 'TA0011'],
  panw: ['TA0011', 'TA0008'],
  fortinet: ['TA0011', 'TA0008'],
  cisco: ['TA0011', 'TA0008'],
  ssh: ['TA0008'],
  rdp: ['TA0008'],

  // Email / Phishing / Initial Access
  email: ['TA0001', 'TA0009', 'TA0010'],
  phishing: ['TA0001'],
  spearphishing: ['TA0001'],
  'initial access': ['TA0001'],

  // Exfiltration / Collection
  exfiltration: ['TA0010', 'TA0009'],
  'data theft': ['TA0010', 'TA0009'],
  collection: ['TA0009'],
  archive: ['TA0009'],

  // Reconnaissance / Discovery
  reconnaissance: ['TA0007', 'TA0001'],
  discovery: ['TA0007'],
  enumeration: ['TA0007'],
  scanning: ['TA0007', 'TA0001'],

  // Command and Control
  beacon: ['TA0011'],
  beaconing: ['TA0011'],
  c2: ['TA0011'],
  'command and control': ['TA0011'],
  cnc: ['TA0011'],

  // Impact
  impact: ['TA0040'],
  encryption: ['TA0040', 'TA0005'],
  'data encrypted': ['TA0040'],
  destruction: ['TA0040'],

  // Threat Intel
  ioc: ['TA0001', 'TA0011'],
  'threat intel': ['TA0001', 'TA0011'],
  indicator: ['TA0001', 'TA0011'],
};

/**
 * Tokenize a user query into lowercase keywords, filtering out stopwords.
 */
function tokenizeQuery(query: string): Set<string> {
  const tokens = new Set<string>();
  const words = query.toLowerCase().split(/[^a-z0-9_\-]+/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i].trim();
    if (word.length > 1 && !STOPWORDS.has(word)) {
      tokens.add(word);
    }
    // Check for multi-word phrases (2-3 words)
    if (i + 1 < words.length) {
      const twoWord = `${word} ${words[i + 1]}`.trim();
      if (!STOPWORDS.has(twoWord) && twoWord.length > 3) {
        tokens.add(twoWord);
      }
    }
    if (i + 2 < words.length) {
      const threeWord = `${word} ${words[i + 1]} ${words[i + 2]}`.trim();
      if (!STOPWORDS.has(threeWord) && threeWord.length > 5) {
        tokens.add(threeWord);
      }
    }
  }

  return tokens;
}

/**
 * Given a set of query tokens, return relevant MITRE tactic IDs.
 * Falls back to ALL tactics if no specific category is detected.
 */
function getRelevantTacticIds(tokens: Set<string>): string[] {
  const relevantIds = new Set<string>();

  for (const token of Array.from(tokens)) {
    const tacticIds = KEYWORD_TO_TACTIC_IDS[token];
    if (tacticIds) {
      tacticIds.forEach((id) => relevantIds.add(id));
    }
  }

  // If no keywords matched, return empty (caller should use full catalog)
  return Array.from(relevantIds);
}

/**
 * Build the text representation of MITRE tactics and techniques
 * for inclusion in the LLM prompt.
 *
 * Uses ALL techniques from the autogenerated MITRE catalog
 * (sourced from `yarn extract-mitre-attacks`), filtered to the
 * target tactics. This ensures every technique in the current
 * ATT&CK version is available for mapping without manual curation.
 */
function buildCatalogText(
  tacticIds: string[] | undefined,
  allTactics: MitreTactic[],
  allTechniques: MitreTechnique[]
): string {
  const tacticMap = new Map<string, MitreTactic>();
  allTactics.forEach((t) => tacticMap.set(t.id, t));

  const techniquesByTactic = new Map<string, MitreTechnique[]>();
  allTechniques.forEach((tech) => {
    tech.tactics.forEach((tacticValue) => {
      const normalizedTacticValue = tacticValue.toLowerCase().replace(/-/g, '');
      const tactic = allTactics.find(
        (t) => t.value.toLowerCase().replace(/-/g, '') === normalizedTacticValue
      );
      if (tactic) {
        const existing = techniquesByTactic.get(tactic.id) ?? [];
        existing.push(tech);
        techniquesByTactic.set(tactic.id, existing);
      }
    });
  });

  const targetIds = tacticIds && tacticIds.length > 0 ? tacticIds : allTactics.map((t) => t.id);

  return targetIds
    .map((id) => {
      const tactic = tacticMap.get(id);
      if (!tactic) return '';

      const techs = techniquesByTactic.get(id) ?? [];
      const techLines = techs.map((t) => `  ${t.id} ${t.name}`).join('\n');

      return `${tactic.id} ${tactic.name}:\n${techLines}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Build a relevance-filtered MITRE ATT&CK catalog for the given user query.
 *
 * Techniques are sourced from the autogenerated `mitre_tactics_techniques.ts`
 * (run `yarn extract-mitre-attacks` to refresh from upstream MITRE CTI).
 * This means every technique in the current ATT&CK version is available —
 * no manual allowlist maintenance is required when MITRE publishes updates.
 *
 * Token-budget control is achieved by tactic-level filtering: when the user
 * query matches known security keywords, only techniques belonging to the
 * matched tactics are included. For unmatched queries, the full catalog is
 * provided so the LLM can still select the most appropriate mapping.
 *
 * @returns The filtered catalog text and metadata about the filter.
 */
export function buildRelevanceFilteredMitreCatalog(userQuery: string): {
  catalogText: string;
  tacticIds: string[];
  isFiltered: boolean;
} {
  const tokens = tokenizeQuery(userQuery);
  const relevantIds = getRelevantTacticIds(tokens);
  const isFiltered = relevantIds.length > 0 && relevantIds.length < tactics.length;

  return {
    catalogText: buildCatalogText(
      relevantIds.length > 0 ? relevantIds : undefined,
      tactics,
      techniques
    ),
    tacticIds: relevantIds.length > 0 ? relevantIds : tactics.map((t) => t.id),
    isFiltered,
  };
}
