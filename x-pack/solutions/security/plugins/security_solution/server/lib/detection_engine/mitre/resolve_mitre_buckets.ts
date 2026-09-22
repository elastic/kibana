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

// Managed and legacy results are cached under separate keys so that a flag flip
// within one process cannot serve the wrong dataset.
let managedCachePromise: Promise<MitreEntitySummaryBuckets> | null = null;
let legacyCachePromise: Promise<MitreEntitySummaryBuckets> | null = null;

/** Resets both caches. Exported for test isolation only. */
export const resetResolveMitreBucketsCache = (): void => {
  managedCachePromise = null;
  legacyCachePromise = null;
};

/**
 * Returns MITRE ATT&CK entity summary buckets, sourcing from the managed client
 * when available and adapting the legacy static blob otherwise. Results are
 * module-level cached by source so repeated requests do not re-query. An empty
 * managed result (SO population not yet complete) is never cached.
 */
export const resolveMitreBuckets = async (
  mitreDataClient?: MitreAttackDataClient
): Promise<MitreEntitySummaryBuckets> => {
  if (mitreDataClient) {
    if (!managedCachePromise) {
      // Assign the Promise before any await so concurrent callers share the same
      // in-flight request.
      managedCachePromise = mitreDataClient.list().then(
        (collection): MitreEntitySummaryBuckets => {
          // An empty managed collection means SO population has not completed yet.
          // Returning it would be indistinguishable from real data to callers —
          // every MITRE ID on every rule would appear invalid. Clear the cache and
          // throw so callers' existing degraded-mode error handling engages instead.
          if (collection.tactics.length === 0 && collection.techniques.length === 0) {
            managedCachePromise = null;
            throw new Error('Managed MITRE data is not initialized');
          }
          return collection;
        },
        (err) => {
          managedCachePromise = null;
          throw err;
        }
      );
    }
    return managedCachePromise;
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
