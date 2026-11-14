/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import type { MitreFramework } from '@kbn/security-mitre-attack-common';
import { iterateMitreThreatEntities } from './iterate_mitre_threat_entities';

/** Per-entity-type sets of valid MITRE IDs. */
export interface ValidMitreIdSets {
  tactic: Set<string>;
  technique: Set<string>;
  subtechnique: Set<string>;
}

/**
 * Valid id sets keyed by framework. A framework whose key is absent is treated as
 * "data unavailable" and its ids are never reported as invalid.
 */
export type ValidMitreIdSetsByFramework = Partial<Record<MitreFramework, ValidMitreIdSets>>;

/**
 * Builds a `ValidMitreIdSets` from any object that has `tactics`, `techniques`, and
 * `subtechniques` arrays whose elements each carry an `id` field. Compatible with both
 * `MitreEntitySummaryBuckets` (managed shape) and the legacy blob arrays.
 */
export const buildValidMitreIdsFromBuckets = (buckets: {
  tactics: ReadonlyArray<{ id: string }>;
  techniques: ReadonlyArray<{ id: string }>;
  subtechniques: ReadonlyArray<{ id: string }>;
}): ValidMitreIdSets => ({
  tactic: new Set(buckets.tactics.map((t) => t.id)),
  technique: new Set(buckets.techniques.map((t) => t.id)),
  subtechnique: new Set(buckets.subtechniques.map((t) => t.id)),
});

/**
 * Returns, per framework, the unique MITRE IDs (tactic, technique, or subtechnique)
 * referenced by a rule's threat mappings that are not present in the valid id sets of
 * their framework. Frameworks with no invalid ids are omitted.
 *
 * Each entity is checked against `validIdsByFramework[entity.framework]`. When no sets
 * are provided for a framework (e.g. its data could not be loaded), entities from that
 * framework are skipped rather than flagged, so unavailable data never produces false
 * positives. The same id under two frameworks is validated and reported per framework.
 *
 * Threat entries whose framework is not recognized are skipped. A missing or empty
 * `threats` value results in an empty object.
 */
export const findInvalidMitreIdsByFramework = (
  threats: Threats | undefined,
  validIdsByFramework: ValidMitreIdSetsByFramework
): Partial<Record<MitreFramework, string[]>> => {
  const invalidIdsByFramework = new Map<MitreFramework, Set<string>>();

  for (const { type, id, framework } of iterateMitreThreatEntities(threats)) {
    const validIds = validIdsByFramework[framework];
    if (validIds !== undefined && !validIds[type].has(id)) {
      const invalidIds = invalidIdsByFramework.get(framework) ?? new Set<string>();
      invalidIds.add(id);
      invalidIdsByFramework.set(framework, invalidIds);
    }
  }

  const result: Partial<Record<MitreFramework, string[]>> = {};
  for (const [framework, invalidIds] of invalidIdsByFramework) {
    result[framework] = Array.from(invalidIds);
  }
  return result;
};

/**
 * Returns the unique MITRE IDs (tactic, technique, or subtechnique) referenced by a
 * rule's threat mappings that are not present in the valid id sets of their framework,
 * flattened across frameworks. Returns an empty array when all referenced IDs are known.
 * See `findInvalidMitreIdsByFramework` for the per-framework form and the handling of
 * unavailable framework data.
 *
 * Each invalid ID is reported at most once even if it is referenced multiple
 * times across the `threats` array, so callers can safely use the result to
 * key React elements.
 */
export const findInvalidMitreIds = (
  threats: Threats | undefined,
  validIdsByFramework: ValidMitreIdSetsByFramework
): string[] => {
  const invalidIds = new Set<string>();
  for (const ids of Object.values(findInvalidMitreIdsByFramework(threats, validIdsByFramework))) {
    ids.forEach((id) => invalidIds.add(id));
  }
  return Array.from(invalidIds);
};
