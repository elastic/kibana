/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import { getImpactedServices } from '../common/impacted_services';

export interface ImpactedServiceChip {
  count: number;
  key: string;
  name: string;
}

export const eventHasImpactedServiceChip = (event: SignificantEvent, chipKey: string): boolean =>
  getImpactedServices(event).some(({ key }) => key === chipKey);

/**
 * Landing impacted-service pills, counted across the events each service appears in.
 */
export const buildImpactedServiceChips = (events: SignificantEvent[]): ImpactedServiceChip[] => {
  const byChip = new Map<string, ImpactedServiceChip>();

  events.forEach((event) => {
    getImpactedServices(event).forEach(({ key, name }) => {
      const current = byChip.get(key);
      byChip.set(key, { key, name, count: (current?.count ?? 0) + 1 });
    });
  });

  return [...byChip.values()].sort(
    (first, second) => second.count - first.count || first.name.localeCompare(second.name)
  );
};

export const filterEventsByImpactedServiceChip = (
  events: SignificantEvent[],
  chipKey: string | undefined
): SignificantEvent[] =>
  chipKey ? events.filter((event) => eventHasImpactedServiceChip(event, chipKey)) : events;
