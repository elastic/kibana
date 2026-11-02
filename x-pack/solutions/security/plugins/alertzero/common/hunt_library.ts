/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Why a hunt cannot run for an identity, in the order the catalog badge reports them. */
export const HUNT_AVAILABILITY_REASONS = [
  'unavailable_scope',
  'unavailable_index',
  'unavailable_mapping',
  'probe_failed',
] as const;

export type HuntAvailabilityReason = (typeof HUNT_AVAILABILITY_REASONS)[number];

export type HuntAvailabilityIdentity = 'caller' | 'worker';

export interface HuntAvailabilityFailure {
  reason: HuntAvailabilityReason;
  /** Bounded, machine-readable specifics: patterns, `missing:<field>`, `conflict:<field>`. */
  details: string[];
}

export interface HuntAvailability {
  identity: HuntAvailabilityIdentity;
  available: boolean;
  /** The first failing check by precedence (scope, index, mapping, probe); null when available. */
  firstFailure: HuntAvailabilityReason | null;
  failures: HuntAvailabilityFailure[];
  /** `skipped` when an earlier check failed or the identity cannot be probed as itself. */
  probe: 'passed' | 'failed' | 'skipped';
}

export interface HuntLibraryListItem {
  id: string;
  version: number;
  name: string;
  description: string;
  platform: string[];
  mitreTechniques: string[];
  resultKind: 'raw_event' | 'aggregate';
  /** The caller's availability; the catalog badge reads this. */
  availability: HuntAvailability;
}

export interface HuntLibraryListResponse {
  hunts: HuntLibraryListItem[];
}

export interface HuntLibraryDetail extends Omit<HuntLibraryListItem, 'availability'> {
  hypothesis: string;
  references: string[];
  guidance: {
    analystNotes: string[];
    expectedFalsePositives: string[];
    suggestedPivots: string[];
  };
  query: {
    id: string;
    query: string;
    defaultTimeRange: { from: string; to: string };
    recommendedColumns: string[];
    requiredIndexPatterns: string[];
    requiredFields: string[];
  };
  source: { tradeId: string; path: string; revision: string };
  callerAvailability: HuntAvailability;
  workerAvailability: HuntAvailability;
}
