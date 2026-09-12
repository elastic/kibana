/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, SignificantEvent } from '@kbn/significant-events-schema';

/**
 * Topology classification that qualifies a reference as an impacted service.
 */
const IMPACTED_SERVICE_TYPE = 'entity';
const IMPACTED_SERVICE_SUBTYPE = 'service';

interface ImpactedServiceCandidate {
  feature_id: string;
  name: string;
  stream_name?: string;
}

export interface ImpactedService {
  key: string;
  name: string;
}

export interface ResolvedImpactedService extends ImpactedService {
  feature: Feature;
}

const isServiceSubtype = (subtype: string | undefined): boolean =>
  subtype?.toLowerCase() === IMPACTED_SERVICE_SUBTYPE;

const getImpactedServiceReferences = (event: SignificantEvent): ImpactedServiceCandidate[] => {
  const impactReferences = (event.blast_radius ?? []).filter(
    (
      entry
    ): entry is Extract<
      NonNullable<SignificantEvent['blast_radius']>[number],
      { type: 'entity' }
    > => entry.type === IMPACTED_SERVICE_TYPE && isServiceSubtype(entry.subtype)
  );
  const causalReferences = (event.causal_features ?? []).filter(
    ({ type, subtype }) =>
      type?.toLowerCase() === IMPACTED_SERVICE_TYPE && isServiceSubtype(subtype)
  );

  return [...impactReferences, ...causalReferences];
};

/**
 * The type prefix namespaces the URL key while the normalized name collapses duplicate service
 * labels from different topology references.
 */
export const getImpactedServiceKey = (name: string): string =>
  `${IMPACTED_SERVICE_TYPE}:${name.toLowerCase()}`;

/** Streams whose knowledge indicators must be loaded before impacted services can be resolved. */
export const getImpactedServiceStreamNames = (events: SignificantEvent[]): string[] => [
  ...new Set(
    events
      .flatMap((event) =>
        getImpactedServiceReferences(event).map(({ stream_name: streamName }) => streamName)
      )
      .filter((streamName): streamName is string => Boolean(streamName))
  ),
];

/**
 * Indexes features under both `uuid` and `id`. `uuid` wins when it collides with another feature's
 * `id`; among `id`s alone the first feature wins.
 */
const indexFeaturesByReference = (features: Feature[]): Map<string, Feature> => {
  const byReference = new Map<string, Feature>();

  for (const feature of features) {
    if (!byReference.has(feature.id)) {
      byReference.set(feature.id, feature);
    }
  }
  for (const feature of features) {
    byReference.set(feature.uuid, feature);
  }

  return byReference;
};

/**
 * Returns the entity-service references carried by an event's blast radius and causal features.
 */
export const getImpactedServices = (event: SignificantEvent): ImpactedService[] => {
  const byKey = new Map<string, ImpactedService>();

  for (const entry of getImpactedServiceReferences(event)) {
    const name = entry.name.trim();
    if (!name) {
      continue;
    }

    const key = getImpactedServiceKey(name);
    if (!byKey.has(key)) {
      byKey.set(key, { key, name });
    }
  }

  return [...byKey.values()];
};

/** Resolves impacted-service references for consumers that need full Knowledge Indicator details. */
export const resolveImpactedServices = (
  event: SignificantEvent,
  features: Feature[]
): ResolvedImpactedService[] => {
  const featuresByReference = indexFeaturesByReference(features);
  const byKey = new Map<string, ResolvedImpactedService>();

  for (const entry of getImpactedServiceReferences(event)) {
    const name = entry.name.trim();
    const feature = featuresByReference.get(entry.feature_id);
    if (!name || !feature) {
      continue;
    }

    const key = getImpactedServiceKey(name);
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        name,
        feature,
      });
    }
  }

  return [...byKey.values()];
};
