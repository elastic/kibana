/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Threat,
  Threats,
  ThreatSubtechnique,
  ThreatTechnique,
} from '@kbn/securitysolution-io-ts-alerting-types';

const normalizeSubtechniques = (subtechnique: unknown): ThreatSubtechnique[] => {
  if (!subtechnique) {
    return [];
  }
  if (!Array.isArray(subtechnique)) {
    return [];
  }
  return subtechnique
    .filter((entry): entry is ThreatSubtechnique => Boolean(entry?.id && entry?.name))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      reference: entry.reference ?? 'none',
    }));
};

const normalizeTechniques = (technique: unknown): ThreatTechnique[] => {
  if (!technique) {
    return [];
  }

  const techniqueEntries = Array.isArray(technique) ? technique : [technique];

  return techniqueEntries
    .filter((entry): entry is ThreatTechnique => Boolean(entry?.id && entry?.name))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      reference: entry.reference ?? 'none',
      subtechnique: normalizeSubtechniques(entry.subtechnique),
    }));
};

/**
 * Normalizes MITRE threat data for the rule creation form.
 * AI-generated rules and attachment edits may omit optional arrays or pass a single technique object.
 */
export const normalizeThreatsForForm = (
  threat: Threats | undefined | null
): Threats | undefined => {
  if (threat == null) {
    return undefined;
  }
  if (!Array.isArray(threat)) {
    return [];
  }

  return threat
    .filter((entry): entry is Threat => Boolean(entry?.tactic?.id && entry?.tactic?.name))
    .map((entry) => ({
      framework: entry.framework ?? 'MITRE ATT&CK',
      tactic: {
        id: entry.tactic.id,
        name: entry.tactic.name,
        reference: entry.tactic.reference ?? 'none',
      },
      technique: normalizeTechniques(entry.technique),
    }));
};
