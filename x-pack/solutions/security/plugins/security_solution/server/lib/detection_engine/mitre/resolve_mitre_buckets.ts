/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This entire module is deleted when the managed source becomes the default
// and the legacy blob (mitre_tactics_techniques) is removed.

import type { Logger } from '@kbn/core/server';
import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import type { MitreEntitySummaryBuckets, MitreFramework } from '@kbn/security-mitre-attack-common';
import { DEFAULT_MITRE_FRAMEWORK } from '@kbn/security-mitre-attack-common';

// Only the legacy blob is cached: it never changes within a process. Managed
// reads go to the data client every time because the Saved Objects can change
// at runtime, and the uncached read is one small find on low-frequency paths.
let legacyCachePromise: Promise<MitreEntitySummaryBuckets> | null = null;

/** Resets the legacy blob cache. Exported for test isolation only. */
export const resetResolveMitreBucketsCache = (): void => {
  legacyCachePromise = null;
};

/**
 * Returns MITRE entity summary buckets for one framework from the managed data client when
 * one is given, otherwise from the cached legacy blob (enterprise only). Throws when the managed
 * collection is empty (population not finished) so callers hit their existing
 * degraded-mode handling instead of treating every rule's MITRE IDs as invalid.
 */
export const resolveMitreBuckets = async (
  mitreDataClient?: MitreAttackDataClient,
  framework: MitreFramework = DEFAULT_MITRE_FRAMEWORK
): Promise<MitreEntitySummaryBuckets> => {
  if (mitreDataClient) {
    const collection = await mitreDataClient.list({ framework });
    // An empty collection means SO population has not finished. Throw rather than
    // return it, otherwise every rule's MITRE IDs would look invalid to callers.
    if (collection.tactics.length === 0 && collection.techniques.length === 0) {
      throw new Error(`Managed MITRE data is not initialized (framework: ${framework})`);
    }
    return collection;
  }

  // The legacy blob is ATT&CK Enterprise only, regardless of what the default framework is.
  if (framework !== 'enterprise') {
    throw new Error(
      `Legacy MITRE data source only provides the enterprise framework (requested: ${framework})`
    );
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

/**
 * Resolves buckets for each requested framework independently. Frameworks that fail to
 * resolve are omitted so one failure does not drop the others.
 */
export const resolveMitreBucketsByFramework = async (
  mitreDataClient: MitreAttackDataClient | undefined,
  frameworks: readonly MitreFramework[],
  logger?: Logger
): Promise<Partial<Record<MitreFramework, MitreEntitySummaryBuckets>>> => {
  const results = await Promise.allSettled(
    frameworks.map((framework) => resolveMitreBuckets(mitreDataClient, framework))
  );

  const bucketsByFramework: Partial<Record<MitreFramework, MitreEntitySummaryBuckets>> = {};
  results.forEach((result, index) => {
    const framework = frameworks[index];
    if (result.status === 'fulfilled') {
      bucketsByFramework[framework] = result.value;
      return;
    }
    const { reason } = result;
    logger?.debug(
      `Failed to resolve MITRE buckets for framework "${framework}": ${
        reason instanceof Error ? reason.message : String(reason)
      }`
    );
  });
  return bucketsByFramework;
};
