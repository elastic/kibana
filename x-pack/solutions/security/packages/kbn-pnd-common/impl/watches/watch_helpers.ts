/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScheduleMode } from '../schemas/components/watch.gen';

/** Minimal schedule shape used by coverage helpers. */
export interface WatchScheduleCoverageInput {
  set: boolean;
  mode: ScheduleMode;
  from: number;
  to: number;
}

export function coverageFromSchedule(
  schedule: WatchScheduleCoverageInput
): Array<[number, number]> {
  if (!schedule.set) return [];
  if (schedule.mode === 'always') return [[0, 24]];
  if (schedule.mode === 'demand') return [];
  const { from, to } = schedule;
  if (from < to) return [[from, to]];
  if (from > to) {
    return [
      [from, 24],
      [0, to],
    ];
  }
  return [[0, 24]];
}

export function isOnDutyNow(coverage: Array<[number, number]>, hourFractional: number): boolean {
  return coverage.some(([a, b]) => hourFractional >= a && hourFractional < b);
}

export interface WatchDisplaySortable {
  sortOrder: number;
  name: string;
}

/** Sort watches for coverage strip + cards: catalog order, then name. */
export function compareWatchesForDisplay(a: WatchDisplaySortable, b: WatchDisplaySortable): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name);
}
