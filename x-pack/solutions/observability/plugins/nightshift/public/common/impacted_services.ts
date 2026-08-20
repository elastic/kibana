/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, SignificantEvent } from '@kbn/significant-events-schema';

/**
 * Knowledge-indicator type and subtype that together qualify a feature reference as an impacted
 * service. A knowledge indicator can also be `infrastructure`, `technology`, `dependency` or
 * `schema` (`INFERRED_FEATURE_TYPES`), and any of those can still carry `subtype: 'service'`, so
 * both halves have to match.
 *
 * `Feature.type` and `Feature.subtype` are unconstrained `z.string()`s written by the model that
 * derives knowledge indicators, so these are value matches rather than typed ones. Comparison is
 * case-insensitive so a feature is not dropped over capitalisation alone.
 */
export const IMPACTED_SERVICE_TYPE = 'entity';
export const IMPACTED_SERVICE_SUBTYPE = 'service';

export interface ImpactedService {
  key: string;
  name: string;
  feature: Feature;
}

/**
 * Feature references an event offers as impacted services: its `blast_radius[]` entity rows and
 * its `causal_features[]`.
 *
 * `blast_radius[]` also carries `infrastructure` rows (components) and `dependency` rows (edges
 * between two services behind one `feature_id`); neither is a service an operator can act on, so
 * only `entity` rows qualify. `causal_features[]` has no row type — every entry names one feature,
 * so its references are filtered on the resolved knowledge indicator alone.
 */
const getCandidateReferences = (
  event: SignificantEvent
): Array<{ feature_id: string; stream_name?: string }> => [
  ...(event.blast_radius ?? []).filter((entry) => entry.type === 'entity'),
  ...(event.causal_features ?? []),
];

/** Streams whose knowledge indicators must be loaded before impacted services can be resolved. */
export const getImpactedServiceStreamNames = (events: SignificantEvent[]): string[] => [
  ...new Set(
    events.flatMap((event) =>
      getCandidateReferences(event)
        .map(({ stream_name: streamName }) => streamName)
        .filter((streamName): streamName is string => Boolean(streamName))
    )
  ),
];

/**
 * Indexes features under both `uuid` and `id`, because `blast_radius[].feature_id` and
 * `causal_features[].feature_id` are written with either. `uuid` is the canonical identifier, so it
 * wins when one feature's `id` collides with another's `uuid`; among `id`s alone the first feature
 * in the list wins.
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
 * Impacted services are the feature references of an event — `blast_radius[]` entity rows and
 * `causal_features[]` alike — that resolve to an `entity` knowledge indicator of subtype `service`.
 * Both arrays routinely name the same service, and neither alone is complete.
 *
 * The knowledge indicator is the authority on what a reference *is*, and it is the only check that
 * covers both arrays: `blast_radius[]` rows carry their own agent-written type, but
 * `causal_features[]` rows carry none, so without this gate a causal reference to a `dependency` or
 * `technology` indicator would render as a service.
 *
 * The label is the knowledge indicator's own, not the free-text `name` on the row, and one service
 * appears once: entries collapse on the case-insensitive label. A knowledge indicator's `uuid` is
 * derived from `(stream_name, id)`, so the same service observed in two streams has two uuids —
 * deduplicating on it would leave the visibly duplicated chips this collapsing exists to remove.
 * Two genuinely distinct services sharing a label therefore collapse too, and the surviving entry
 * carries the first resolved feature.
 *
 * References that resolve to no stored feature are dropped — without the feature there is no
 * subtype to check, and keeping them would break the services-only guarantee. So is a feature left
 * with no label: `title` and `id` are both unbounded below, and a blank one would render as a chip
 * carrying a count and no name. Nothing falls back to a stream name, so an event with no resolvable
 * references contributes no services at all.
 */
export const getImpactedServices = (
  event: SignificantEvent,
  features: Feature[]
): ImpactedService[] => {
  const featuresByReference = indexFeaturesByReference(features);
  const byKey = new Map<string, ImpactedService>();

  for (const { feature_id: featureId } of getCandidateReferences(event)) {
    const feature = featuresByReference.get(featureId);
    if (
      feature?.type.toLowerCase() !== IMPACTED_SERVICE_TYPE ||
      feature.subtype?.toLowerCase() !== IMPACTED_SERVICE_SUBTYPE
    ) {
      continue;
    }

    const name = feature.title?.trim() || feature.id.trim();
    if (!name) {
      continue;
    }

    const key = name.toLowerCase();
    if (!byKey.has(key)) {
      byKey.set(key, { key, name, feature });
    }
  }

  return [...byKey.values()];
};
