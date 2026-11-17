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

/** One manual session in a hunt's run history. Metadata only: no query, filters or rows. */
export interface HuntHistoryEntry {
  kind: 'manual_session';
  sessionId: string;
  executionId: string;
  definitionVersion: number;
  /** `exploratory` until a later phase records a preserved or other outcome. */
  outcome: string;
  startedAt: string;
  startedBy?: string;
  /** The Investigation this session preserved evidence to, once it has one. */
  investigationId?: string;
}

export interface HuntHistoryResponse {
  history: HuntHistoryEntry[];
}

export interface HuntLaunchResponse {
  session_id: string;
  execution_id: string;
  /** True when this call was a retry of a launch that already recorded the session. */
  reused_existing: boolean;
  /** Identifies the session to Discover, which opens in Hunt mode with it. */
  profile_token: string;
}

/** What a Hunt session resolves to, for Discover's Hunt mode. */
export interface HuntSessionVerification {
  session_id: string;
  session_execution_id: string;
  /** Set when the session continues an existing Investigation. */
  investigation_id?: string;
  /** ISO-8601 time the session stops being accepted. */
  expires_at: string;
  definition: {
    id: string;
    version: number;
    name: string;
    hypothesis: string;
    /** Whether the hunt returns events (preserved by reference) or aggregate rows (preserved as shown). */
    resultKind: 'raw_event' | 'aggregate';
    references: string[];
    guidance: {
      analystNotes: string[];
      expectedFalsePositives: string[];
      suggestedPivots: string[];
    };
  };
}

/** The result of preserving selected rows as evidence on an Investigation. */
export interface HuntPreserveResponse {
  investigation_id: string;
  /** Unique evidence rows on the Investigation after this request. */
  evidence_count: number;
  /** Rows this request added. Zero for a retry or a repeated selection. */
  added_count: number;
  /** True when this request created the Investigation. */
  created: boolean;
  /** Identifies the session, now linked to the Investigation; later preservations append to it. */
  profile_token: string;
}

/** Everything Discover needs to reopen a hunt from an Investigation. */
export interface HuntContinueResponse {
  /** A fresh session, so run history shows the continuation as its own session. */
  session_id: string;
  execution_id: string;
  investigation_id: string;
  definition_id: string;
  /** Identifies the new session, linked to this Investigation, that opens Discover in Hunt mode. */
  profile_token: string;
  /** The Discover state to restore. Row selection and other UI state are not restored. */
  resume: {
    query: string;
    filters: Array<Record<string, string | number | boolean | null>>;
    time_range: { from: string; to: string };
    columns: string[];
    data_view_id: string;
  };
}

/** What re-running a session's handoff cleanup did. */
export interface HuntHandoffCleanupRetryResponse {
  result: 'nothing_to_do' | 'repaired' | 'finalized_failed' | 'retry_later' | 'exhausted';
}
