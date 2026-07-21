/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AutonomyLevel, ScheduleMode } from '../schemas/components/watch.gen';

/** Minimal schedule shape used by coverage helpers. */
export interface WatchScheduleCoverageInput {
  set: boolean;
  mode: ScheduleMode;
  from: number;
  to: number;
}

/**
 * Labels for Throughline UI-facing autonomy levels.
 * 1 Suggest only · 2 Reads auto · 3 Drafts auto · 4 Acts · gated · 5 Acts · trusted
 */
export const AUTONOMY_LABELS = [
  'Suggest only',
  'Reads auto',
  'Drafts auto',
  'Acts · gated',
  'Acts · trusted',
] as const;

export type AutonomyLabel = (typeof AUTONOMY_LABELS)[number];
export const SKILL_LABELS: Record<string, string> = {
  'alert-analysis': 'Alert analysis',
  'alert-triage': 'Alert triage',
  'case-assembly': 'Case assembly',
  'slo-review': 'SLO review',
  'brief-generation': 'Brief generation',
  'threat-hunt': 'Threat hunt (TTP)',
  'detection-tuning': 'Detection tuning',
  'noise-suppress': 'Noise suppression',
  'mailbox-rules': 'Mailbox rules',
  'edge-block': 'Edge brute-force',
  'beacon-watch': 'Beacon watch',
  'anom-tx': 'Anomalous transactions',
};

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

export function autonomyLabel(level: AutonomyLevel): AutonomyLabel {
  const clamped = Math.min(Math.max(Math.trunc(level), 1), 5);
  return AUTONOMY_LABELS[clamped - 1];
}

export function skillLabel(skillId: string): string {
  return SKILL_LABELS[skillId] ?? skillId;
}
