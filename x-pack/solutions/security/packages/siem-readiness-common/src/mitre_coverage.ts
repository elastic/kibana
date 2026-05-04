/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Minimal shape of a threat entry needed for MITRE tactic checks.
 * Both browser detection rule responses and server rule params satisfy this shape.
 */
export interface MitreThreatEntry {
  tactic?: { name?: string };
}

/**
 * Canonical list of MITRE ATT&CK tactic names (title case, display order).
 */
export const MITRE_TACTICS = [
  'Initial Access',
  'Defense Evasion',
  'Privilege Escalation',
  'Persistence',
  'Lateral Movement',
  'Execution',
  'Discovery',
  'Collection',
  'Exfiltration',
  'Impact',
  'Resource Development',
  'Credential Access',
  'Command and Control',
  'Reconnaissance',
] as const;

export type MitreTactic = (typeof MITRE_TACTICS)[number];

/** Lowercase set for O(1) membership checks. */
const MITRE_TACTICS_LOWER = new Set(MITRE_TACTICS.map((t) => t.toLowerCase()));

/**
 * Returns true if the given tactic name matches one of the 14 MITRE ATT&CK tactics.
 * Comparison is case-insensitive.
 */
export const isMitreTacticName = (name: string | undefined): boolean => {
  if (!name) return false;
  return MITRE_TACTICS_LOWER.has(name.trim().toLowerCase());
};

/**
 * Returns true if the rule has at least one threat entry mapped to a MITRE ATT&CK tactic.
 */
export const hasMitreTacticMapping = (threats: MitreThreatEntry[] | undefined): boolean => {
  return Boolean(threats?.some((t) => isMitreTacticName(t.tactic?.name)));
};

/**
 * Returns only the threats from the array that map to a MITRE ATT&CK tactic.
 */
export const getMitreMappedThreats = (
  threats: MitreThreatEntry[] | undefined
): MitreThreatEntry[] => {
  return (threats ?? []).filter((t) => isMitreTacticName(t.tactic?.name));
};

/**
 * Filters a list of rules (any shape with a `threat` array) to those mapped to a given MITRE tactic.
 * Comparison is case-insensitive.
 */
export const getRulesForMitreTactic = <T extends { threat?: MitreThreatEntry[] }>(
  rules: T[],
  tacticName: string
): T[] => {
  const lower = tacticName.toLowerCase();
  return rules.filter((rule) =>
    rule.threat?.some((t) => t.tactic?.name?.trim().toLowerCase() === lower)
  );
};
