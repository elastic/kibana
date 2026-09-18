/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedIndexScope } from '../common/types';

/**
 * IOC kinds Tier 1 knows how to map to ECS fields (`hunt_for_threat.ts:120-145`
 * in mustard). Kept local to this plugin rather than imported from
 * `security_solution` — Hunt depends on TI supply's HTTP surface, never on
 * its internals, per the one-way dependency rule (buildout.md:31).
 */
export const IOC_TYPES = ['ip', 'email', 'domain', 'url', 'hash'] as const;
export type IocType = (typeof IOC_TYPES)[number];

export interface HuntIoc {
  type: IocType;
  value: string;
}

export interface HuntForThreatParams {
  /** The resolved index scope from A2 — required and optional patterns, plus rowLimit/window defaults. */
  scope: ResolvedIndexScope;
  iocs?: HuntIoc[];
  techniques?: string[];
  /** Overrides the scope's window when the caller wants a narrower/wider range for this run. */
  timeRange?: { from: string; to: string };
  /** Overrides the scope's rowLimit for this run. */
  size?: number;
  maxAssets?: number;
}

export interface HuntForThreatHit {
  index: string;
  id: string;
  score: number | null;
  [key: string]: unknown;
}

export interface AffectedAsset {
  name: string;
  hitCount: number;
}

/**
 * Tier 1's raw statuses (plan.md:259: "keep the three raw statuses ... as
 * the service-level output"). The hit/clean collapse for `evidence[].last_hunt_status`
 * happens in the managed-workflow evidence step (F4), not here — a blocked scope is
 * a fourth, orthogonal state the caller must check before running Tier 1 at all
 * (A2's `status`).
 */
export type HuntForThreatStatus =
  | 'no_searchable_terms'
  | 'no_environment_hits'
  | 'environment_hits_found';

export interface HuntForThreatResult {
  status: HuntForThreatStatus;
  /**
   * A confirmed event match in a required index inside the window
   * (hunt-watch-implementation.md:42). A match only in an optional index,
   * or outside the window, does not set this — it can still appear in
   * `hits`/`counts` for context, but never flips `hasConfirmedHit`.
   */
  hasConfirmedHit: boolean;
  searchedIocs: number;
  searchedTechniques: number;
  resolvedIocs: HuntIoc[];
  resolvedTechniques: string[];
  timeRange: { from: string; to: string };
  counts: {
    totalHits: number;
    returnedHits: number;
    affectedHosts: number;
    affectedUsers: number;
  };
  hits: HuntForThreatHit[];
  affectedAssets: { hosts: AffectedAsset[]; users: AffectedAsset[] };
  perIndex: Array<{ index: string; hitCount: number }>;
  message?: string;
}
