/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BlastRadiusEntry, CausalFeature } from '@kbn/significant-events-schema';

/**
 * Counts distinct entities in an event's member-union topology (causal_features ∪ blast_radius, deduped by feature_id).
 */
export const computeTopologyBreadth = (
  causalFeatures: CausalFeature[] | undefined,
  blastRadius: BlastRadiusEntry[] | undefined
): number => {
  const featureIds = new Set<string>();
  for (const feature of causalFeatures ?? []) featureIds.add(feature.feature_id);
  for (const entry of blastRadius ?? []) featureIds.add(entry.feature_id);
  return featureIds.size;
};

/**
 * Counts the largest same-target set of distinct dependency callers in the member-union blast_radius.
 */
export const computeTopologyFanOut = (blastRadius: BlastRadiusEntry[] | undefined): number => {
  const callersByTarget = new Map<string, Set<string>>();
  for (const entry of blastRadius ?? []) {
    if (entry.type !== 'dependency') {
      continue;
    }

    const callers = callersByTarget.get(entry.target) ?? new Set<string>();
    callers.add(entry.source);
    callersByTarget.set(entry.target, callers);
  }
  return Math.max(0, ...[...callersByTarget.values()].map((callers) => callers.size));
};

/**
 * True when multiple sources depend on the same target in the member-union blast_radius, indicating a confirmed call-chain cascade.
 */
export const hasCascadePath = (blastRadius: BlastRadiusEntry[] | undefined): boolean =>
  computeTopologyFanOut(blastRadius) >= 2;
