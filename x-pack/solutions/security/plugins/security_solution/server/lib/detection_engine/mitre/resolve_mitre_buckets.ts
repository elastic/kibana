/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This entire module is deleted when the managed source becomes the default
// and the legacy blob (mitre_tactics_techniques) is removed.

import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import type { MitreEntitySummaryBuckets } from '@kbn/security-mitre-attack-common';

// Only the legacy blob is cached: it never changes within a process. Managed
// reads go to the data client every time because the Saved Objects can change
// at runtime, and the uncached read is one small find on low-frequency paths.
let legacyCachePromise: Promise<MitreEntitySummaryBuckets> | null = null;

/** Resets the legacy blob cache. Exported for test isolation only. */
export const resetResolveMitreBucketsCache = (): void => {
  legacyCachePromise = null;
};

/**
 * Returns MITRE ATT&CK entity summary buckets from the managed data client when
 * one is given, otherwise from the cached legacy blob. Throws when the managed
 * collection is empty (population not finished) so callers hit their existing
 * degraded-mode handling instead of treating every rule's MITRE IDs as invalid.
 */
export const resolveMitreBuckets = async (
  mitreDataClient?: MitreAttackDataClient
): Promise<MitreEntitySummaryBuckets> => {
  if (mitreDataClient) {
    const collection = await mitreDataClient.list();
    // An empty collection means SO population has not finished. Throw rather than
    // return it, otherwise every rule's MITRE IDs would look invalid to callers.
    if (collection.tactics.length === 0 && collection.techniques.length === 0) {
      throw new Error('Managed MITRE data is not initialized');
    }
    return collection;
  }

  // Fallback: serves the bundled legacy blob when xpack.mitreAttack.managedSourceEnabled is off.
  // Remove once the managed source is the default and the blob is deleted.
  if (!legacyCachePromise) {
    legacyCachePromise = (async () => {
      const { tactics, techniques, subtechniques } = await import(
        '../../../../common/detection_engine/mitre/mitre_tactics_techniques'
      );
      const { transformLegacyMitreData } = await import(
        '../../../../common/detection_engine/mitre/mitre_data_adapter'
      );
      return transformLegacyMitreData({ tactics, techniques, subtechniques });
    })().then(undefined, (err) => {
      legacyCachePromise = null;
      throw err;
    });
  }
  return legacyCachePromise;
};
