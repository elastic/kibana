/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/deeplinks-security';

export const ALERTZERO_FEATURE_ID = 'alertzero' as const;
export const ALERTZERO_PLUGIN_NAME = 'AlertZero' as const;
/** Mirrored as `ALERTZERO_APP_ID` in `@kbn/security-solution-navigation`; keep the two in sync. */
export const ALERTZERO_APP_ID = 'alertzero' as const;
export const ALERTZERO_APP_PATH = '/app/alertzero' as const;

export const ALERTZERO_INTERNAL_URL = '/internal/alertzero' as const;

export const ALERTZERO_WATCHES_URL = `${ALERTZERO_INTERNAL_URL}/watches` as const;
export const ALERTZERO_WATCH_URL_TEMPLATE = `${ALERTZERO_WATCHES_URL}/{watchId}` as const;

export const buildWatchUrl = (watchId: string) =>
  `${ALERTZERO_WATCHES_URL}/${encodeURIComponent(watchId)}`;

/** Global worker catalog — shared across watches. */
export const ALERTZERO_WORKERS_URL = `${ALERTZERO_INTERNAL_URL}/workers` as const;

export const ALERTZERO_WORKER_URL_TEMPLATE = `${ALERTZERO_WORKERS_URL}/{workerId}` as const;

export const buildWorkerUrl = (workerId: string) =>
  `${ALERTZERO_WORKERS_URL}/${encodeURIComponent(workerId)}`;

/** Proposals grouped by category — AlertZero landing page. */
export const ALERTZERO_PROPOSALS_URL = `${ALERTZERO_INTERNAL_URL}/proposals` as const;

/** Action catalog — category-scoped discovery of installed action workflows. */
export const ALERTZERO_ACTIONS_URL = `${ALERTZERO_INTERNAL_URL}/actions` as const;

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
export const SYSTEM_SECURITY_WATCH_DEEP_ID = 'system-security-watch-deep' as const;
export const SYSTEM_SECURITY_WATCH_DETECTION_ID = 'system-security-watch-detection' as const;

export const SYSTEM_SECURITY_WATCH_IDS = [
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  SYSTEM_SECURITY_WATCH_HUNT_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
] as const;

/**
 * The autonomy dial, in ascending order — programme decision D15 (2026-07-28).
 *
 * Deliberately one shared scale rather than per-watch: a level must mean the same thing on every
 * watch, composed with per-callable gates and the org-wide floor. Only the *selected* level varies
 * per watch. See https://github.com/elastic/security-team/issues/18718.
 */
export const WATCH_AUTONOMY_LEVELS = ['manual', 'assisted', 'supervised'] as const;

/**
 * The review-gated subset of the dial: every action passes a human review gate, so the Worker
 * offers no unattended (supervised) level. Declared once here so narrowing the shared scale can
 * never leave these declarations behind.
 */
export const WATCH_AUTONOMY_REVIEW_GATED = ['manual', 'assisted'] as const;

/**
 * Presentation metadata for the managed watch catalog.
 *
 * The managed five are compile-time constants, so consumers that must not wait for an HTTP round
 * trip — the app's deep links and the solution navigation tree — build their
 * entries from this list rather than from `list_watches`.
 *
 * Deliberately free of schema imports: both consumers are page-load critical, and pulling a schema
 * in would drag Zod into that bundle. Live placeholders take name and colour from here.
 *
 * Custom (unmanaged) watches are absent by construction — they are discoverable only at runtime.
 */
export const SYSTEM_SECURITY_WATCH_CATALOG = [
  {
    id: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    deepLinkId: SecurityPageName.alertZeroWatchFloor,
    name: 'Triage Watch',
    color: '#16b3a6',
  },
  {
    id: SYSTEM_SECURITY_WATCH_OFFICER_ID,
    deepLinkId: SecurityPageName.alertZeroWatchOfficer,
    name: 'Watch Officer',
    color: '#3b82f6',
  },
  {
    id: SYSTEM_SECURITY_WATCH_HUNT_ID,
    deepLinkId: SecurityPageName.alertZeroWatchHunt,
    name: 'Hunt Watch',
    color: '#f59e0b',
  },
  {
    id: SYSTEM_SECURITY_WATCH_DEEP_ID,
    deepLinkId: SecurityPageName.alertZeroWatchDeep,
    name: 'Forensics Watch',
    color: '#8b5cf6',
  },
  {
    id: SYSTEM_SECURITY_WATCH_DETECTION_ID,
    deepLinkId: SecurityPageName.alertZeroWatchDetection,
    name: 'Detection Watch',
    color: '#ec4899',
  },
] as const;

export type SystemSecurityWatchCatalogEntry = (typeof SYSTEM_SECURITY_WATCH_CATALOG)[number];

export const WATCH_TAG = 'watch' as const;
export const WATCH_FLOOR_TAG = 'watch-floor' as const;
export const WATCH_OFFICER_TAG = 'watch-officer' as const;
export const WATCH_HUNT_TAG = 'watch-hunt' as const;
export const WATCH_DEEP_TAG = 'watch-deep' as const;
export const WATCH_DETECTION_TAG = 'watch-detection' as const;

export const WATCH_TIER_TAGS = [
  WATCH_FLOOR_TAG,
  WATCH_OFFICER_TAG,
  WATCH_HUNT_TAG,
  WATCH_DEEP_TAG,
  WATCH_DETECTION_TAG,
] as const;

/** Managed Worker workflow ids — tagged Watch members. Hunt CTH is the externally settled id. */
export const SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID =
  'system-security-floor-alert-triage' as const;
export const SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID =
  'system-security-floor-attack-discovery' as const;
export const SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID =
  'system-security-hunt-continuous-threat-hunt' as const;
export const SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID =
  'system-security-detection-rule-tuning' as const;
export const SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID =
  'system-security-detection-rule-creation' as const;

export const SYSTEM_SECURITY_WORKER_IDS = [
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
] as const;

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
    id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
    name: 'Rule Creation',
    watchId: SYSTEM_SECURITY_WATCH_DETECTION_ID,
    watchTag: WATCH_DETECTION_TAG,
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
