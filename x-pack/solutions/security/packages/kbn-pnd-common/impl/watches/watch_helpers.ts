/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_CATALOG,
  SYSTEM_SECURITY_WATCH_IDS,
  WATCH_TAG,
  WATCH_TIER_TAGS,
} from '../../constants';
import type { ScheduleMode, Watch } from '../schemas/components/watch.gen';

export type CatalogWatchId = (typeof SYSTEM_SECURITY_WATCH_IDS)[number];

const PLACEHOLDER_SCHEDULE: Watch['schedule'] = {
  set: false,
  mode: 'demand',
  from: 0,
  to: 23,
  onDemand: true,
  cadence: 'manual',
  every: 1,
  handoff: 'none',
};

/**
 * Live not-installed row: catalog identity plus empty runtime fields. Does not read mock fixtures.
 */
export function createCatalogWatchPlaceholder(watchId: CatalogWatchId): Watch {
  const index = SYSTEM_SECURITY_WATCH_IDS.indexOf(watchId);
  const entry = SYSTEM_SECURITY_WATCH_CATALOG[index];
  const tierTag = WATCH_TIER_TAGS[index];
  if (!entry || !tierTag) {
    throw new Error(`Missing managed watch catalog entry for "${watchId}"`);
  }

  return {
    id: entry.id,
    name: entry.name,
    tags: [WATCH_TAG, tierTag],
    color: entry.color,
    enabled: false,
    draft: false,
    managed: true,
    sortOrder: (index + 1) * 10,
    mandate: '',
    description: '',
    ...('isBeta' in entry && entry.isBeta ? { lifecycle: 'beta' as const } : {}),
    schedule: { ...PLACEHOLDER_SCHEDULE },
    triggers: [],
    coverage: [],
    scopeSummary: '',
    scopes: [],
    skills: [],
    metrics: { lastRun: null },
    recentRuns: [],
  };
}

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
