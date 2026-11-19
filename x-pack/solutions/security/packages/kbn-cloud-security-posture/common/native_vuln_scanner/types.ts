/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Wire types of the native vulnerability scanner onboarding routes. They live here so the
 * Cloud Security Posture UI can type its requests without a plugin dependency on
 * `native_vuln_scanner`, which owns the routes and imports these same types.
 */

export type SummaryRunStatus = 'success' | 'partial' | 'failed' | 'aborted' | 'no_pack';

export type SummaryFeedStatus = 'matched' | 'unavailable' | 'failed';

export interface SummaryFeed {
  /** `family:version`, e.g. `ubuntu:noble`. */
  release: string;
  status: SummaryFeedStatus;
  /** Validator the vendor sent with the feed, when it sent one. */
  etag?: string;
  /** Why the release failed. */
  error?: string;
  /** The URL the feed was fetched from. */
  source_url?: string;
  /** ISO date the vendor published the snapshot, when the feed carried one. */
  snapshot_time?: string;
  /** Whole seconds from the run's start to `snapshot_time`; only with a `snapshot_time`. */
  age_seconds?: number;
}

export interface SummaryDoc {
  '@timestamp': string;
  /** The workflow execution id; also the doc id, so a retried summarize overwrites instead of duplicating. */
  run_id: string;
  started_at: string;
  finished_at: string;
  status: SummaryRunStatus;
  hosts_scanned: number;
  findings_open: number;
  findings_fixed: number;
  feeds: SummaryFeed[];
  /** Per-release failure messages, mirrored from `feeds` for easy display. */
  failures: string[];
  /** Whether findings were checked against the CISA KEV catalog, and how many are listed. */
  kev?: { status: 'ok' | 'stale' | 'unavailable' | 'not_attempted'; listed: number };
  /** Distinct CVE ids among this run's matched findings (unfixed included). */
  distinct_cves?: number;
}

export type PackState = 'missing' | 'ok' | 'differs';

export type PackAction =
  | 'create'
  | 'add_policies'
  | 'repair_queries'
  | 'repair_queries_and_add_policies'
  | 'no_change';

/** Machine-readable reason a pack differs; the browser renders the text. */
export type PackDifferenceCode =
  | 'pack_disabled'
  | 'schedule_type_differs'
  | 'interval_differs'
  | 'query_missing'
  | 'query_sql_differs'
  | 'query_platform_differs'
  | 'query_not_snapshot'
  | 'query_disabled';

export interface PackDifference {
  code: PackDifferenceCode;
  /** The query concerned; absent for pack-level differences. */
  queryId?: string;
}

export interface PackInspection {
  state: PackState;
  /** Saved object id of the stored pack, so the UI can run it as a live query. Absent when missing. */
  packId?: string;
  /** Why the pack differs from the expected body; empty unless `state` is `differs`. */
  differences: PackDifference[];
  /** Agent policies the pack is assigned to. */
  policyIds: string[];
}

export interface PackPlan {
  state: PackState;
  action: PackAction;
  differences: PackDifference[];
  /** Selected policies the pack is not yet assigned to. */
  addPolicyIds: string[];
}

export interface RuntimePinConflict {
  key: string;
  from: string;
  to: string;
}

export type PolicyPlanOutcome = 'change' | 'no_change' | 'refused' | 'not_found';

export type PolicyRefusalReason =
  | 'not_found'
  | 'managed'
  | 'agentless'
  | 'no_osquery_integration'
  | 'invalid_agent_internal';

export interface PolicyPlan {
  id: string;
  name: string | null;
  outcome: PolicyPlanOutcome;
  /** Set when `outcome` is `refused` or `not_found`. */
  reason?: PolicyRefusalReason;
  /** Names the `agent_internal` key that cannot be edited, for `invalid_agent_internal`. */
  key?: string;
  message?: string;
  /** `agent_internal` YAML as stored, and as it would be written. Only set for `change`. */
  before?: string;
  after?: string;
  conflicts: RuntimePinConflict[];
}

export interface OnboardingPlan {
  pack: PackPlan;
  policies: PolicyPlan[];
}

export type RuntimePinOutcome = 'updated' | 'no_change' | 'refused' | 'not_found' | 'failed';

export interface RuntimePinResult extends Omit<PolicyPlan, 'outcome' | 'before' | 'after'> {
  outcome: RuntimePinOutcome;
}

export type PolicyOnboardingState =
  | 'not_configured'
  | 'pending_inventory'
  | 'reporting'
  | 'scanned';

export interface PolicyStatus {
  id: string;
  name: string;
  packAssigned: boolean;
  runtimePinned: boolean;
  /** Null when the caller cannot read Fleet agents. */
  agents: { total: number; online: number } | null;
  /** Null when agents are not readable by the caller. */
  reportingInventory: number | null;
  state: PolicyOnboardingState;
}

export interface OnboardingStatus {
  license: 'ok';
  pack: PackInspection;
  policies: PolicyStatus[];
  /** Policies without a usable osquery_manager integration. */
  needsOsqueryIntegration: Array<{ id: string; name: string }>;
  /** Agentless policies: they cannot run osquerybeat, so they are never onboarded. */
  agentlessPolicies: Array<{ id: string; name: string }>;
  lastScan: SummaryDoc | null;
  schedule: { installed: boolean; enabled: boolean };
  scanRunning: boolean;
  /** False when the caller lacks Fleet agents read: agent counts and reporting are then null. */
  agentsVisible: boolean;
  /** True when the agent list hit the server's agent cap, so per-policy counts may be low. */
  agentsTruncated: boolean;
}

/** The status route answers this instead of the body when the licence is below Enterprise. */
export interface InsufficientLicenseStatus {
  license: 'insufficient';
}
