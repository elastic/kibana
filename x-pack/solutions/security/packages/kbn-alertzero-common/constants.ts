/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/deeplinks-security';
import {
  REVIEW_GATED_AUTONOMY_LEVELS,
  WORKER_AUTONOMY_LEVELS,
} from '@kbn/workflows/managed/definitions/alertzero/worker_settings_defaults';

export const ALERTZERO_FEATURE_ID = 'alertzero' as const;
export const ALERTZERO_PLUGIN_NAME = 'AlertZero' as const;
/** Mirrored as `ALERTZERO_APP_ID` in `@kbn/security-solution-navigation`; keep the two in sync. */
export const ALERTZERO_APP_ID = 'alertzero' as const;
export const ALERTZERO_APP_PATH = '/app/alertzero' as const;

/**
 * Per-space advanced setting gating the AlertZero app, its Security navigation nodes, and its
 * internal API. Registered by the AlertZero server plugin (`server/ui_settings.ts`), and only when
 * the `xpack.alertzero.enabled` deployment kill switch is on.
 */
export const ALERTZERO_ENABLED_SETTING_ID = 'securitySolution:enableAlertZero' as const;

export const ALERTZERO_INTERNAL_URL = '/internal/alertzero' as const;

export const ALERTZERO_WATCHES_URL = `${ALERTZERO_INTERNAL_URL}/watches` as const;
export const ALERTZERO_WATCH_URL_TEMPLATE = `${ALERTZERO_WATCHES_URL}/{watchId}` as const;

export const buildWatchUrl = (watchId: string) =>
  `${ALERTZERO_WATCHES_URL}/${encodeURIComponent(watchId)}`;

/** Security's service-account directory. The id is opaque and may contain `/`. */
export const SECURITY_SERVICE_ACCOUNT_URL = '/internal/security/service_account' as const;

export const buildServiceAccountUrl = (serviceAccountId: string) =>
  `${SECURITY_SERVICE_ACCOUNT_URL}/${encodeURIComponent(serviceAccountId)}`;

/** Global worker catalog — shared across watches. */
export const ALERTZERO_WORKERS_URL = `${ALERTZERO_INTERNAL_URL}/workers` as const;

export const ALERTZERO_WORKER_URL_TEMPLATE = `${ALERTZERO_WORKERS_URL}/{workerId}` as const;

export const buildWorkerUrl = (workerId: string) =>
  `${ALERTZERO_WORKERS_URL}/${encodeURIComponent(workerId)}`;

/** Pending proposals for a single action category. */
export const ALERTZERO_PROPOSALS_CATEGORY_URL =
  `${ALERTZERO_INTERNAL_URL}/proposals/category/{category}` as const;

/** Proposals decided in the last 72 h (any non-pending status, including expired). */
export const ALERTZERO_PROPOSALS_CLOSED_URL = `${ALERTZERO_INTERNAL_URL}/proposals/closed` as const;

/** Action catalog — category-scoped discovery of installed action workflows. */
export const ALERTZERO_ACTIONS_URL = `${ALERTZERO_INTERNAL_URL}/actions` as const;
export const ALERTZERO_INVESTIGATIONS_COUNT_URL =
  `${ALERTZERO_INTERNAL_URL}/investigations/count` as const;

// --- Hunt services ---
// Exported here, not just from the alertzero plugin's own common/constants.ts, so the
// platform-level kbn-workflows managed-definitions tests can assert Hunt Watch's managed
// YAML never references a route path string that isn't one of these, without reaching into
// a private solution plugin's server modules.

/** Internal route namespace for the hunt services. */
export const HUNT_INTERNAL_ROUTE_BASE = '/internal/alertzero/hunt' as const;

/** The hunt scope for the space: the default data view Tier 1 searches and what resolved in it. */
export const HUNT_INDEX_SCOPE_URL = `${HUNT_INTERNAL_ROUTE_BASE}/index_scope` as const;

/** Candidate report selection for the tagged Worker's scheduled sweep and manual trigger. */
export const CANDIDATES_URL = `${HUNT_INTERNAL_ROUTE_BASE}/candidates` as const;

/** Two-tier hunt pipeline for a single report, called by the hunt child (`hunt.yaml`). */
export const HUNT_COORDINATOR_URL = `${HUNT_INTERNAL_ROUTE_BASE}/hunt_coordinator` as const;

/** Mints or verifies the Hunt Watch Investigation for a report, called by its own child workflow. */
export const FIND_OR_CREATE_INVESTIGATION_URL =
  `${HUNT_INTERNAL_ROUTE_BASE}/find_or_create_investigation` as const;

/** Stamps the hunt-once gate on a report after a completed `run_hunt_coordinator` call. */
export const WRITE_HUNT_EVIDENCE_URL = `${HUNT_INTERNAL_ROUTE_BASE}/write_hunt_evidence` as const;

/** Failed managed scans in the trailing 24 hours, folded onto Workers. */
export const ALERTZERO_SCAN_FAILURES_URL = `${ALERTZERO_INTERNAL_URL}/scan-failures` as const;

export interface ScanFailureWorker {
  workerId: string;
  watchId: string;
}

export interface ScanFailuresResponse {
  workers: ScanFailureWorker[];
  unknown: boolean;
}

/** Agent Builder builtin tool wrapping the action catalog API. */
export const ALERTZERO_ACTIONS_LIST_TOOL_ID = 'security.alertzero.actions.list' as const;

/**
 * Shared thin AlertZero agent for all Worker `ai.agent` steps.
 * Can expand this to multiple scoped thin agents in the future if needed.
 * Prefer avoiding 1-1 correlation between Kibana managed agent and AlertZero Worker
 */
export const ALERTZERO_THIN_AGENT_ID = 'alertzero-thin-agent' as const;

/** Managed catalog workflow ids — owned by Security. */
export const SYSTEM_SECURITY_WATCH_FLOOR_ID = 'system-security-watch-floor' as const;
export const SYSTEM_SECURITY_WATCH_OFFICER_ID = 'system-security-watch-officer' as const;
export const SYSTEM_SECURITY_WATCH_HUNT_ID = 'system-security-watch-hunt' as const;
export const SYSTEM_SECURITY_WATCH_FORENSICS_ID = 'system-security-watch-forensics' as const;
export const SYSTEM_SECURITY_WATCH_DETECTION_ID = 'system-security-watch-detection' as const;

export const SYSTEM_SECURITY_WATCH_IDS = [
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  SYSTEM_SECURITY_WATCH_HUNT_ID,
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WATCH_FORENSICS_ID,
] as const;

/**
 * The autonomy dial, in ascending order — programme decision D15 (2026-07-28).
 *
 * Deliberately one shared scale rather than per-watch: a level must mean the same thing on every
 * watch, composed with per-callable gates and the org-wide floor. Only the *selected* level varies
 * per watch. See https://github.com/elastic/security-team/issues/18718.
 */
export const WATCH_AUTONOMY_LEVELS = WORKER_AUTONOMY_LEVELS;

/**
 * The review-gated subset of the dial: every action passes a human review gate, so the Worker
 * offers no unattended (supervised) level.
 */
export const WATCH_AUTONOMY_REVIEW_GATED = REVIEW_GATED_AUTONOMY_LEVELS;

/**
 * Presentation metadata for the managed watch catalog.
 *
 * The managed five are compile-time constants, so consumers that must not wait for an HTTP round
 * trip — the app's deep links and the solution navigation tree — build their
 * entries from this list rather than from `list_watches`.
 *
 * Deliberately free of schema imports: both consumers are page-load critical, and pulling a schema
 * in would drag Zod into that bundle. Live placeholders take name and colour from here.
 * `color` is an EUI token key (`euiColorVisN` or `textAssistance`), resolved at render.
 *
 * Custom (unmanaged) watches are absent by construction — they are discoverable only at runtime.
 */
export const SYSTEM_SECURITY_WATCH_CATALOG = [
  {
    id: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    deepLinkId: SecurityPageName.alertZeroWatchFloor,
    name: 'Triage Watch',
    color: 'euiColorVis0',
  },
  {
    id: SYSTEM_SECURITY_WATCH_OFFICER_ID,
    deepLinkId: SecurityPageName.alertZeroWatchOfficer,
    name: 'Watch Officer',
    color: 'euiColorVis1',
  },
  {
    id: SYSTEM_SECURITY_WATCH_HUNT_ID,
    deepLinkId: SecurityPageName.alertZeroWatchHunt,
    name: 'Hunt Watch',
    color: 'euiColorVis8',
  },
  {
    id: SYSTEM_SECURITY_WATCH_DETECTION_ID,
    deepLinkId: SecurityPageName.alertZeroWatchDetection,
    name: 'Detection Watch',
    color: 'textAssistance',
  },
  {
    id: SYSTEM_SECURITY_WATCH_FORENSICS_ID,
    deepLinkId: SecurityPageName.alertZeroWatchForensics,
    name: 'Forensics Watch',
    color: 'euiColorVis4',
  },
] as const;

export const WATCH_TAG = 'watch' as const;
export const WATCH_FLOOR_TAG = 'watch-floor' as const;
export const WATCH_OFFICER_TAG = 'watch-officer' as const;
export const WATCH_HUNT_TAG = 'watch-hunt' as const;
export const WATCH_FORENSICS_TAG = 'watch-forensics' as const;
export const WATCH_DETECTION_TAG = 'watch-detection' as const;

export const WATCH_TIER_TAGS = [
  WATCH_FLOOR_TAG,
  WATCH_OFFICER_TAG,
  WATCH_HUNT_TAG,
  WATCH_DETECTION_TAG,
  WATCH_FORENSICS_TAG,
] as const;

export type SystemSecurityWatchCatalogEntry = (typeof SYSTEM_SECURITY_WATCH_CATALOG)[number];

/** Managed Worker workflow ids — tagged Watch members. Hunt CTH is the externally settled id. */
export const SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID =
  'system-security-floor-alert-triage' as const;
export const SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID =
  'system-security-floor-attack-discovery' as const;
export const SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID =
  'system-security-forensics-endpoint-analysis' as const;
export const SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID =
  'system-security-hunt-continuous-threat-hunt' as const;
export const SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID =
  'system-security-detection-rule-tuning' as const;
export const SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID =
  'system-security-detection-rule-coverage' as const;

export const SYSTEM_SECURITY_WORKER_IDS = [
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
] as const;

/**
 * Hunt Watch's two feature children (tagged `security` + `continuous-threat-hunt`),
 * dispatched by the tagged Worker above. `find_or_create_investigation` and the hunt
 * child itself stay untagged Worker-branch plumbing and have no id here.
 */
export const SYSTEM_SECURITY_HUNT_PACKAGE_REPORT_ID =
  'system-security-hunt-package-report' as const;
export const SYSTEM_SECURITY_HUNT_PROPOSAL_GATE_ID = 'system-security-hunt-proposal-gate' as const;

/**
 * Static Worker catalog: Watch membership and display names for not-yet-installed Workers.
 * Rendered YAML must still carry the matching `watch` + tier tags.
 */
export const SYSTEM_SECURITY_WORKER_CATALOG = [
  {
    id: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
    name: 'Alert Triage',
    watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    watchTag: WATCH_FLOOR_TAG,
  },
  {
    id: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
    name: 'Attack Discovery',
    watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    watchTag: WATCH_FLOOR_TAG,
  },
  {
    id: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
    name: 'Continuous Threat Hunt',
    watchId: SYSTEM_SECURITY_WATCH_HUNT_ID,
    watchTag: WATCH_HUNT_TAG,
  },
  {
    id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
    name: 'Rule Tuning',
    watchId: SYSTEM_SECURITY_WATCH_DETECTION_ID,
    watchTag: WATCH_DETECTION_TAG,
  },
  {
    id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
    name: 'Rule Coverage',
    watchId: SYSTEM_SECURITY_WATCH_DETECTION_ID,
    watchTag: WATCH_DETECTION_TAG,
  },
  {
    id: SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
    name: 'Endpoint Analysis',
    watchId: SYSTEM_SECURITY_WATCH_FORENSICS_ID,
    watchTag: WATCH_FORENSICS_TAG,
  },
] as const;

export type SystemSecurityWorkerCatalogEntry = (typeof SYSTEM_SECURITY_WORKER_CATALOG)[number];

/**
 * Units offered for a Worker's schedule interval, ordered for display. Seconds are excluded: the
 * workflow engine only accepts them at 60 or above, and a sub-minute Worker cadence is meaningless.
 */
export const WORKER_SCHEDULE_UNITS = ['m', 'h', 'd'] as const;

export type WorkerScheduleUnit = (typeof WORKER_SCHEDULE_UNITS)[number];

/**
 * Inference feature registry ids. Operators pick the model for each tier in Stack Management >
 * Model Settings, and Worker `ai.agent` steps resolve through them with
 * `connector-id-by-feature` instead of naming an endpoint themselves.
 *
 * The axis is the kind of call, not the Worker. One Worker can span several tiers — Attack
 * Discovery generates and then investigates, three `workflow.execute` hops apart — and a step
 * names its own tier wherever it sits in the call tree, so nothing has to be threaded through
 * `workflow.execute` inputs. A new Worker usually costs no new tier.
 *
 * Tiers are named for the execution profile a model needs rather than the task it happens to serve
 * today, so a step is not pushed toward the wrong rung by a name that reads like a job title: the
 * same fast model that gates an alert also enriches a threat report. Other Security features are
 * expected to pin to these rather than register per-feature rows of their own.
 */
export const ALERTZERO_INFERENCE_PARENT_FEATURE_ID = 'alertzero_parent' as const;
/** Low latency, high volume, lightweight judgment. */
export const ALERTZERO_FAST_INFERENCE_FEATURE_ID = 'alertzero_fast' as const;
/** Deeper single-shot thinking on a self-contained task. */
export const ALERTZERO_REASONING_INFERENCE_FEATURE_ID = 'alertzero_reasoning' as const;
/** Multi-step work over tools and iteration, where cost multiplies by the round count. */
export const ALERTZERO_AGENTIC_INFERENCE_FEATURE_ID = 'alertzero_agentic' as const;

/** Agent Builder conversation template ids. A proposal is an attachment, not a template. */
export const TEMPLATE_ID_INVESTIGATION = 'investigation' as const;
export const TEMPLATE_ID_ESCALATION = 'escalation' as const;

export const API_VERSIONS = {
  internal: {
    v1: '1',
  },
} as const;

export const INTERNAL_API_ACCESS = 'internal' as const;
