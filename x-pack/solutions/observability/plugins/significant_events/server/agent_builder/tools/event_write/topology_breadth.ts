/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BlastRadiusEntry, CausalFeature } from '@kbn/significant-events-schema';

/**
 * Counts distinct entities in an event's member-union topology (causal_features ∪ blast_radius,
 * deduped by feature_id).
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
 * Counts distinct dependency edges (deduped by feature_id) in the member-union blast_radius
 */
export const computeTopologyFanOut = (blastRadius: BlastRadiusEntry[] | undefined): number => {
  const edges = new Set<string>();
  for (const entry of blastRadius ?? []) {
    if (entry.type === 'dependency') edges.add(entry.feature_id);
  }
  return edges.size;
};

/**
 * True when the member-union blast_radius carries at least one dependency-type edge — a
 * confirmed call-chain cascade, independent of how many distinct entities it resolves to.
 */
export const hasCascadePath = (blastRadius: BlastRadiusEntry[] | undefined): boolean =>
  (blastRadius ?? []).some((entry) => entry.type === 'dependency');
