/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, SignificantEvent } from '@kbn/significant-events-schema';
import { getImpactedEntities } from '../common/impacted_entities';

export interface BlastRadiusChip {
  count: number;
  key: string;
  name: string;
}

export const eventHasBlastRadiusChip = (
  event: SignificantEvent,
  chipKey: string,
  features: Feature[]
): boolean => getImpactedEntities(event, features).some(({ key }) => key === chipKey);

/** Landing blast-radius pills from the impacted entities of need-action events. */
export const buildBlastRadiusChips = (
  events: SignificantEvent[],
  features: Feature[]
): BlastRadiusChip[] => {
  const byChip = new Map<string, BlastRadiusChip>();

  events.forEach((event) => {
    getImpactedEntities(event, features).forEach(({ key, name }) => {
      const current = byChip.get(key);
      byChip.set(key, { key, name, count: (current?.count ?? 0) + 1 });
    });
  });

  return [...byChip.values()].sort(
    (first, second) => second.count - first.count || first.name.localeCompare(second.name)
  );
};

export const filterEventsByBlastRadiusChip = (
  events: SignificantEvent[],
  chipKey: string | undefined,
  features: Feature[]
): SignificantEvent[] =>
  chipKey ? events.filter((event) => eventHasBlastRadiusChip(event, chipKey, features)) : events;
