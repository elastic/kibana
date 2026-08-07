/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import {
  getBlastRadiusEntryChipKey,
  getBlastRadiusEntryChipName,
} from '../common/blast_radius_display';

export type { BlastRadiusEntry } from '@kbn/significant-events-schema';
export {
  getBlastRadiusEntryChipKey,
  getBlastRadiusEntryChipName,
  getFeatureDisplayName,
} from '../common/blast_radius_display';

export interface BlastRadiusChip {
  count: number;
  key: string;
  name: string;
}

export const eventHasBlastRadiusChip = (event: SignificantEvent, chipKey: string): boolean => {
  const blastRadius = event.blast_radius ?? [];
  if (blastRadius.length > 0) {
    return blastRadius.some((entry) => getBlastRadiusEntryChipKey(entry) === chipKey);
  }
  return (event.stream_names ?? []).includes(chipKey);
};

/** Landing blast-radius pills from `blast_radius[]` on need-action events (falls back to `stream_names`). */
export const buildBlastRadiusChips = (events: SignificantEvent[]): BlastRadiusChip[] => {
  const byChip = new Map<string, { count: number; name: string }>();

  events.forEach((event) => {
    const blastRadius = event.blast_radius ?? [];
    const chipKeys =
      blastRadius.length > 0
        ? blastRadius.map((entry) => ({
            key: getBlastRadiusEntryChipKey(entry),
            name: getBlastRadiusEntryChipName(entry),
          }))
        : (event.stream_names ?? []).map((name) => ({ key: name, name }));

    const seenOnEvent = new Set<string>();
    chipKeys.forEach(({ key, name }) => {
      if (seenOnEvent.has(key)) {
        return;
      }
      seenOnEvent.add(key);
      const current = byChip.get(key);
      byChip.set(key, { name, count: (current?.count ?? 0) + 1 });
    });
  });

  return Array.from(byChip, ([key, { count, name }]) => ({ count, key, name })).sort(
    (first, second) => second.count - first.count || first.name.localeCompare(second.name)
  );
};

export const filterEventsByBlastRadiusChip = (
  events: SignificantEvent[],
  chipKey: string | undefined
): SignificantEvent[] =>
  chipKey ? events.filter((event) => eventHasBlastRadiusChip(event, chipKey)) : events;
