/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import { resolveMitreBuckets } from '../../../detection_engine/mitre/resolve_mitre_buckets';

export interface TacticInfo {
  id: string;
  name: string;
  /** Managed MITRE matrix position. */
  position: number;
}

export interface TacticLookup {
  byId: ReadonlyMap<string, TacticInfo>;
  /** Tactics in matrix order. */
  ordered: readonly TacticInfo[];
  /** Maps a tactic id or (v18 / v19 / short) name to its id; undefined when unknown. */
  resolveId: (raw: string) => string | undefined;
  /** Display name for an id, falling back to the id. */
  nameOf: (id: string) => string;
  /** Matrix position for an id; unknown tactics sort after known ones. */
  positionOf: (id: string) => number;
}

/**
 * Known names by tactic id across ATT&CK v18 and v19. TA0005 was "Defense Evasion" in v18 and is
 * "Stealth" in v19; TA0112 ("Defense Impairment") is new in v19. Used to alias names found in
 * alerts and Attack Discovery documents back to ids.
 */
const KNOWN_TACTIC_NAMES: ReadonlyArray<readonly [string, string]> = [
  ['TA0043', 'Reconnaissance'],
  ['TA0042', 'Resource Development'],
  ['TA0001', 'Initial Access'],
  ['TA0002', 'Execution'],
  ['TA0003', 'Persistence'],
  ['TA0004', 'Privilege Escalation'],
  ['TA0005', 'Defense Evasion'],
  ['TA0005', 'Stealth'],
  ['TA0112', 'Defense Impairment'],
  ['TA0006', 'Credential Access'],
  ['TA0007', 'Discovery'],
  ['TA0008', 'Lateral Movement'],
  ['TA0009', 'Collection'],
  ['TA0011', 'Command and Control'],
  ['TA0010', 'Exfiltration'],
  ['TA0040', 'Impact'],
];

const TACTIC_ID_PATTERN = /^TA\d{4}$/;

const normalizeName = (name: string): string =>
  name.trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');

export const buildTacticLookup = (tactics: readonly TacticInfo[]): TacticLookup => {
  const byId = new Map(tactics.map((tactic) => [tactic.id, tactic]));
  const idByName = new Map<string, string>();
  for (const [id, name] of KNOWN_TACTIC_NAMES) {
    idByName.set(normalizeName(name), id);
  }
  for (const { id, name } of tactics) {
    idByName.set(normalizeName(name), id);
  }
  const ordered = [...tactics].sort((a, b) => a.position - b.position);

  return {
    byId,
    ordered,
    resolveId: (raw) => {
      const trimmed = raw.trim();
      if (TACTIC_ID_PATTERN.test(trimmed)) return trimmed;
      return idByName.get(normalizeName(trimmed));
    },
    nameOf: (id) => byId.get(id)?.name ?? id,
    positionOf: (id) => byId.get(id)?.position ?? Number.MAX_SAFE_INTEGER,
  };
};

/** Static matrix order used only when managed / legacy MITRE data cannot be read. */
const FALLBACK_TACTICS: readonly TacticInfo[] = [
  { id: 'TA0043', name: 'Reconnaissance' },
  { id: 'TA0042', name: 'Resource Development' },
  { id: 'TA0001', name: 'Initial Access' },
  { id: 'TA0002', name: 'Execution' },
  { id: 'TA0003', name: 'Persistence' },
  { id: 'TA0004', name: 'Privilege Escalation' },
  { id: 'TA0005', name: 'Stealth' },
  { id: 'TA0112', name: 'Defense Impairment' },
  { id: 'TA0006', name: 'Credential Access' },
  { id: 'TA0007', name: 'Discovery' },
  { id: 'TA0008', name: 'Lateral Movement' },
  { id: 'TA0009', name: 'Collection' },
  { id: 'TA0011', name: 'Command and Control' },
  { id: 'TA0010', name: 'Exfiltration' },
  { id: 'TA0040', name: 'Impact' },
].map((tactic, index) => ({ ...tactic, position: index }));

/** Loads tactic names and order from the (v19-aware) MITRE data client, else the bundled blob. */
export const loadTacticLookup = async (
  mitreDataClient?: MitreAttackDataClient
): Promise<TacticLookup> => {
  try {
    const { tactics } = await resolveMitreBuckets(mitreDataClient);
    if (tactics.length > 0) {
      return buildTacticLookup(tactics.map(({ id, name, position }) => ({ id, name, position })));
    }
  } catch {
    // fall through to the static order
  }
  return buildTacticLookup(FALLBACK_TACTICS);
};
