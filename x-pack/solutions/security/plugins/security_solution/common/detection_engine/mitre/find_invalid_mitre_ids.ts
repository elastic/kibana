/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import { iterateMitreThreatEntities } from './iterate_mitre_threat_entities';

/** Per-entity-type sets of valid MITRE IDs. */
export interface ValidMitreIdSets {
  tactic: Set<string>;
  technique: Set<string>;
  subtechnique: Set<string>;
}

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
 * Returns the unique MITRE ATT&CK™ IDs (tactic, technique, or subtechnique)
 * referenced by a rule's threat mappings that are not present in `validIds`.
 * Returns an empty array when all referenced IDs are known.
 *
 * Each invalid ID is reported at most once even if it is referenced multiple
 * times across the `threats` array, so callers can safely use the result to
 * key React elements.
 *
 * Non-MITRE framework entries are skipped. A missing or empty `threats` value
 * results in an empty array.
 */
export const findInvalidMitreIds = (
  threats: Threats | undefined,
  validIds: ValidMitreIdSets
): string[] => {
  const invalidIds = new Set<string>();

  for (const { type, id } of iterateMitreThreatEntities(threats)) {
    if (!validIds[type].has(id)) {
      invalidIds.add(id);
    }
  }

  return Array.from(invalidIds);
};
