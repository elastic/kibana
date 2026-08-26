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

/**
 * A `dependency` row names an edge — `source` → `target` behind a single `feature_id` — so it has
 * no unambiguous subject to render as one service. Every other row type is a candidate.
 */
type ImpactedServiceCandidate = Exclude<BlastRadiusEntry, { type: 'dependency' }>;

export interface ImpactedService {
  key: string;
  name: string;
  streamName: string;
  feature: Feature;
}

const isCandidateEntry = (entry: BlastRadiusEntry): entry is ImpactedServiceCandidate =>
  entry.type !== 'dependency';

const getCandidateEntries = (event: SignificantEvent): ImpactedServiceCandidate[] =>
  (event.blast_radius ?? []).filter(isCandidateEntry);

/** `entity` rows carry a required `name`; `infrastructure` rows only an optional `title`. */
const getEntryName = (entry: ImpactedServiceCandidate, feature: Feature): string =>
  entry.type === 'entity' ? entry.name : entry.title ?? feature.title ?? feature.id;

/**
 * A single `feature_id` can name more than one service, so the name is part of the key.
 *
 * `getBlastRadiusEbtDetail` derives the privacy-safe analytics category from the leading entry
 * type, so the prefix has to stay.
 */
export const getImpactedServiceKey = (entry: ImpactedServiceCandidate, name: string): string =>
  `${entry.type}:${entry.feature_id}:${name}`;

/** Streams whose knowledge indicators must be loaded before impacted services can be resolved. */
export const getImpactedServiceStreamNames = (events: SignificantEvent[]): string[] => [
  ...new Set(
    events.flatMap((event) => getCandidateEntries(event).map(({ stream_name }) => stream_name))
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
 * Impacted services are the `blast_radius[]` rows backed by a `service` knowledge indicator.
 * `causal_features[]` is deliberately not used: it names what *caused* the incident.
 *
 * The knowledge indicator decides whether a row is a service, not the row's own `type`:
 * `blast_radius[].type` is written per event by the agent while `subtype` comes from the knowledge
 * indicator pipeline, so an `infrastructure` row resolving to a service is still an impacted
 * service.
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

  for (const entry of getCandidateEntries(event)) {
    const feature = featuresByReference.get(entry.feature_id);
    if (feature?.subtype?.toLowerCase() !== IMPACTED_SERVICE_SUBTYPE) {
      continue;
    }

    const name = getEntryName(entry, feature);
    const key = getImpactedServiceKey(entry, name);
    if (!byKey.has(key)) {
      byKey.set(key, { key, name, streamName: feature.stream_name, feature });
    }
  }

  return [...byKey.values()];
};
