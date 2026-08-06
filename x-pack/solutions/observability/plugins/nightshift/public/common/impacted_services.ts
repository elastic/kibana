/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BlastRadiusEntry, Feature, SignificantEvent } from '@kbn/significant-events-schema';

/**
 * Knowledge-indicator subtype that qualifies a blast radius entry as an impacted service.
 *
 * `Feature.subtype` is an unconstrained `z.string()` written by the model that derives knowledge
 * indicators, so this is a value match rather than a typed one. Comparison is case-insensitive so
 * a row is not dropped over capitalisation alone.
 */
export const IMPACTED_SERVICE_SUBTYPE = 'service';

type BlastRadiusEntityEntry = Extract<BlastRadiusEntry, { type: 'entity' }>;

export interface ImpactedService {
  key: string;
  name: string;
  streamName: string;
  feature: Feature;
}

const isEntityEntry = (entry: BlastRadiusEntry): entry is BlastRadiusEntityEntry =>
  entry.type === 'entity';

const getEntityEntries = (event: SignificantEvent): BlastRadiusEntityEntry[] =>
  (event.blast_radius ?? []).filter(isEntityEntry);

/**
 * A single `feature_id` can name more than one service, so the name is part of the key.
 *
 * The leading entry type is always `entity` here, but it is not redundant: `getBlastRadiusEbtDetail`
 * derives the privacy-safe analytics category from this prefix, and the key stays comparable with
 * the other blast radius entry types should they ever be surfaced again.
 */
export const getImpactedServiceKey = (entry: BlastRadiusEntityEntry): string =>
  `${entry.type}:${entry.feature_id}:${entry.name}`;

/** Streams whose knowledge indicators must be loaded before impacted services can be resolved. */
export const getImpactedServiceStreamNames = (events: SignificantEvent[]): string[] => [
  ...new Set(
    events.flatMap((event) => getEntityEntries(event).map(({ stream_name }) => stream_name))
  ),
];

/**
 * Indexes features under both `uuid` and `id`, because `blast_radius[].feature_id` is written with
 * either. `uuid` is the canonical identifier, so it wins when one feature's `id` collides with
 * another's `uuid`; among `id`s alone the first feature in the list wins.
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
 * Impacted services are the `entity` rows of `blast_radius[]` backed by a `service` knowledge
 * indicator. `causal_features[]` is deliberately not used: it names what *caused* the incident.
 *
 * Rows whose `feature_id` resolves to no stored feature are dropped — without the feature there is
 * no subtype to check, and keeping them would break the services-only guarantee. Nothing falls back
 * to a stream name, so an event with no resolvable rows contributes no services at all.
 */
export const getImpactedServices = (
  event: SignificantEvent,
  features: Feature[]
): ImpactedService[] => {
  const featuresByReference = indexFeaturesByReference(features);
  const byKey = new Map<string, ImpactedService>();

  for (const entry of getEntityEntries(event)) {
    const key = getImpactedServiceKey(entry);
    if (byKey.has(key)) {
      continue;
    }

    const feature = featuresByReference.get(entry.feature_id);
    if (feature?.subtype?.toLowerCase() !== IMPACTED_SERVICE_SUBTYPE) {
      continue;
    }

    byKey.set(key, { key, name: entry.name, streamName: feature.stream_name, feature });
  }

  return [...byKey.values()];
};
