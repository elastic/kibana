/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, SignificantEvent } from '@kbn/significant-events-schema';
import { getImpactedServices } from '../common/impacted_services';

export interface BlastRadiusChip {
  count: number;
  key: string;
  name: string;
}

interface BlastRadiusChipOptions {
  /** Knowledge indicators used to resolve each event's blast radius into impacted services. */
  features: Feature[];
}

export const eventHasBlastRadiusChip = (
  event: SignificantEvent,
  chipKey: string,
  { features }: BlastRadiusChipOptions
): boolean => getImpactedServices(event, features).some(({ key }) => key === chipKey);

/**
 * Landing blast-radius pills. Each pill is one impacted service — the subset of `blast_radius[]`
 * that resolves to a `service` knowledge indicator — counted across the events it appears in.
 */
export const buildBlastRadiusChips = (
  events: SignificantEvent[],
  { features }: BlastRadiusChipOptions
): BlastRadiusChip[] => {
  const byChip = new Map<string, BlastRadiusChip>();

  events.forEach((event) => {
    getImpactedServices(event, features).forEach(({ key, name }) => {
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
  { features }: BlastRadiusChipOptions
): SignificantEvent[] =>
  chipKey
    ? events.filter((event) => eventHasBlastRadiusChip(event, chipKey, { features }))
    : events;
