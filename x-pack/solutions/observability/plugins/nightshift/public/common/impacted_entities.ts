/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BlastRadiusEntry, Feature, SignificantEvent } from '@kbn/significant-events-schema';

/** Knowledge-indicator subtype that qualifies a blast radius entry as an impacted entity. */
export const IMPACTED_ENTITY_SUBTYPE = 'service';

type BlastRadiusEntityEntry = Extract<BlastRadiusEntry, { type: 'entity' }>;

export interface ImpactedEntity {
  key: string;
  name: string;
  streamName: string;
  feature: Feature;
}

type EventBlastRadius = Pick<SignificantEvent, 'blast_radius'>;

const isEntityEntry = (entry: BlastRadiusEntry): entry is BlastRadiusEntityEntry =>
  entry.type === 'entity';

const getEntityEntries = (event: EventBlastRadius): BlastRadiusEntityEntry[] =>
  (event.blast_radius ?? []).filter(isEntityEntry);

export const getImpactedEntityKey = (entry: BlastRadiusEntityEntry): string =>
  `${entry.type}:${entry.feature_id}:${entry.name}`;

/** Streams whose knowledge indicators must be loaded before impacted entities can be resolved. */
export const getImpactedEntityStreamNames = (events: EventBlastRadius[]): string[] => [
  ...new Set(
    events.flatMap((event) => getEntityEntries(event).map(({ stream_name }) => stream_name))
  ),
];

/**
 * Impacted entities are the `entity` rows of `blast_radius[]` backed by a `service` knowledge
 * indicator. `causal_features[]` is deliberately not used: it names what *caused* the incident.
 *
 * Rows whose `feature_id` resolves to no stored feature are dropped — without the feature there is
 * no subtype to check, and keeping them would break the services-only guarantee. Nothing falls back
 * to a stream name, so an event with no resolvable rows contributes no entities at all.
 */
export const getImpactedEntities = (
  event: EventBlastRadius,
  features: Feature[]
): ImpactedEntity[] => {
  const byKey = new Map<string, ImpactedEntity>();

  for (const entry of getEntityEntries(event)) {
    const key = getImpactedEntityKey(entry);
    if (byKey.has(key)) {
      continue;
    }

    const feature = features.find(
      (candidate) => candidate.uuid === entry.feature_id || candidate.id === entry.feature_id
    );
    if (feature?.subtype !== IMPACTED_ENTITY_SUBTYPE) {
      continue;
    }

    byKey.set(key, { key, name: entry.name, streamName: feature.stream_name, feature });
  }

  return [...byKey.values()];
};
