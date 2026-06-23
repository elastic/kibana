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

const MIN_KEYWORD_LENGTH = 3;

/**
 * Maximum fraction of techniques a word can appear in before it is
 * considered too generic to be useful for tactic filtering.
 * Words appearing in more than 15% of technique names are skipped.
 */
const MAX_TECHNIQUE_FREQUENCY_RATIO = 0.15;

/**
 * Normalize a tactic value for comparison: lowercase + strip dashes.
 * Technique tactic values use kebab-case (e.g. "credential-access")
 * while tactic values use camelCase (e.g. "credentialAccess").
 */
function normalizeTacticValue(value: string): string {
  return value.toLowerCase().replace(/-/g, '');
}

/**
 * Build the tactic lookup: maps normalized tactic value → tactic ID.
 * Computed once at module load.
 */
function buildTacticValueToId(allTactics: MitreTactic[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const tactic of allTactics) {
    map.set(normalizeTacticValue(tactic.value), tactic.id);
  }
  return map;
}

/**
 * Extract meaningful lowercase tokens from a string.
 * Filters out tokens shorter than MIN_KEYWORD_LENGTH.
 */
function extractTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= MIN_KEYWORD_LENGTH);
}

/**
 * Auto-derive keyword → tactic ID mapping from the MITRE catalog.
 *
 * For each technique, meaningful words from its name are mapped to
 * the tactic IDs that technique belongs to. Words that appear in
 * more than MAX_TECHNIQUE_FREQUENCY_RATIO of all techniques are
 * discarded as too generic (e.g., "data", "system", "service").
 *
 * A small curated set of domain abbreviations and synonyms that
 * don't appear in MITRE technique names is merged in last.
 */
function buildKeywordToTacticIds(
  allTactics: MitreTactic[],
  allTechniques: MitreTechnique[]
): Map<string, Set<string>> {
  const tacticValueToId = buildTacticValueToId(allTactics);
  const wordToTactics = new Map<string, Set<string>>();
  const wordTechniqueCount = new Map<string, number>();

  for (const tech of allTechniques) {
    const tacticIds = tech.tactics
      .map((tv) => tacticValueToId.get(normalizeTacticValue(tv)))
      .filter((id): id is string => id != null);

    const words = new Set(extractTokens(tech.name));
    for (const word of words) {
      wordTechniqueCount.set(word, (wordTechniqueCount.get(word) ?? 0) + 1);
      const existing = wordToTactics.get(word) ?? new Set<string>();
      tacticIds.forEach((id) => existing.add(id));
      wordToTactics.set(word, existing);
    }
  }

  // Also index tactic names so "execution", "exfiltration", etc. map directly
  for (const tactic of allTactics) {
    for (const word of extractTokens(tactic.name)) {
      const existing = wordToTactics.get(word) ?? new Set<string>();
      existing.add(tactic.id);
      wordToTactics.set(word, existing);
    }
  }

  // Filter out overly generic words
  const maxCount = Math.ceil(allTechniques.length * MAX_TECHNIQUE_FREQUENCY_RATIO);
  for (const [word, count] of wordTechniqueCount) {
    if (count > maxCount) {
      wordToTactics.delete(word);
    }
  }

  // Domain abbreviations / synonyms not present in MITRE technique names
  const DOMAIN_SYNONYMS: Record<string, string[]> = {
    aws: ['TA0001', 'TA0004', 'TA0005', 'TA0011'],
    cloudtrail: ['TA0001', 'TA0004', 'TA0005', 'TA0011'],
    gcp: ['TA0001', 'TA0004', 'TA0005', 'TA0011'],
    k8s: ['TA0002', 'TA0004', 'TA0011'],
    okta: ['TA0001', 'TA0006', 'TA0004'],
    sso: ['TA0001', 'TA0006'],
    mfa: ['TA0001', 'TA0006'],
    rdp: ['TA0008'],
    ssh: ['TA0008'],
    vpn: ['TA0008', 'TA0011'],
    c2: ['TA0011'],
    cnc: ['TA0011'],
    ioc: ['TA0001', 'TA0011'],
    lsass: ['TA0006'],
    uac: ['TA0004', 'TA0005'],
    powershell: ['TA0002', 'TA0005', 'TA0006'],
    sysmon: ['TA0002', 'TA0004', 'TA0005', 'TA0006', 'TA0007'],
  };

  for (const [keyword, ids] of Object.entries(DOMAIN_SYNONYMS)) {
    const existing = wordToTactics.get(keyword) ?? new Set<string>();
    ids.forEach((id) => existing.add(id));
    wordToTactics.set(keyword, existing);
  }

  return wordToTactics;
}

// Module-level caches (computed once on first import)
const keywordToTacticIds = buildKeywordToTacticIds(tactics, techniques);

/**
 * Tokenize a user query into lowercase keywords, filtering out
 * words shorter than MIN_KEYWORD_LENGTH (generic function words).
 * Short tokens (< MIN_KEYWORD_LENGTH) are still included when they
 * appear in the keyword map (e.g. domain abbreviations like "c2").
 */
function tokenizeQuery(query: string): Set<string> {
  const tokens = new Set<string>();
  const words = query.toLowerCase().split(/[^a-z0-9_-]+/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i].trim();
    if (word.length >= MIN_KEYWORD_LENGTH || keywordToTacticIds.has(word)) {
      tokens.add(word);
    }
    if (i + 1 < words.length) {
      const twoWord = `${word} ${words[i + 1]}`.trim();
      if (twoWord.length > MIN_KEYWORD_LENGTH) {
        tokens.add(twoWord);
      }
    }
    if (i + 2 < words.length) {
      const threeWord = `${word} ${words[i + 1]} ${words[i + 2]}`.trim();
      if (threeWord.length > MIN_KEYWORD_LENGTH + 2) {
        tokens.add(threeWord);
      }
    }
  }

  return tokens;
}

/**
 * Given a set of query tokens, return relevant MITRE tactic IDs
 * by matching against the auto-derived keyword map.
 */
function getRelevantTacticIds(tokens: Set<string>): string[] {
  const relevantIds = new Set<string>();

  for (const token of tokens) {
    const tacticIds = keywordToTacticIds.get(token);
    if (tacticIds) {
      tacticIds.forEach((id) => relevantIds.add(id));
    }
  }

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
      const tacticId = buildTacticValueToId(allTactics).get(normalizeTacticValue(tacticValue));
      if (tacticId) {
        const existing = techniquesByTactic.get(tacticId) ?? [];
        existing.push(tech);
        techniquesByTactic.set(tacticId, existing);
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
 * Keyword-to-tactic mapping is derived automatically from technique and
 * tactic names, supplemented by a small set of domain abbreviations.
 * No hand-maintained allowlists or stopword lists are required.
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
