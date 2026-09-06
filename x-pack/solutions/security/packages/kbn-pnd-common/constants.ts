/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/deeplinks-security';
import type { RecommendedAction } from './impl/schemas';

export const PND_FEATURE_ID = 'pnd' as const;
export const PND_PLUGIN_NAME = 'PND' as const;
export const PND_APP_ID = 'pnd' as const;
export const PND_APP_PATH = '/app/pnd' as const;

export const PND_INTERNAL_URL = '/internal/pnd' as const;

export const PND_WATCHES_URL = `${PND_INTERNAL_URL}/watches` as const;
export const PND_WATCH_URL_TEMPLATE = `${PND_WATCHES_URL}/{watchId}` as const;

export const buildWatchUrl = (watchId: string) =>
  `${PND_WATCHES_URL}/${encodeURIComponent(watchId)}`;

/** Global worker / skill catalogs — shared across watches. */
export const PND_WORKERS_URL = `${PND_INTERNAL_URL}/workers` as const;
export const PND_SKILLS_URL = `${PND_INTERNAL_URL}/skills` as const;

export const PND_WORKER_URL_TEMPLATE = `${PND_WORKERS_URL}/{workerId}` as const;
export const PND_SKILL_URL_TEMPLATE = `${PND_SKILLS_URL}/{skillId}` as const;

export const buildWorkerUrl = (workerId: string) =>
  `${PND_WORKERS_URL}/${encodeURIComponent(workerId)}`;

export const buildSkillUrl = (skillId: string) =>
  `${PND_SKILLS_URL}/${encodeURIComponent(skillId)}`;

export const PND_INVESTIGATIONS_URL = `${PND_INTERNAL_URL}/investigations` as const;
export const PND_INVESTIGATION_URL_TEMPLATE = `${PND_INVESTIGATIONS_URL}/{id}` as const;

export const buildInvestigationUrl = (id: string) =>
  `${PND_INVESTIGATIONS_URL}/${encodeURIComponent(id)}`;

/**
 * Shared thin AlertZero agent for all Worker `ai.agent` steps.
 * Can expand this to multiple scoped thin agents in the future if needed.
 * Prefer avoiding 1-1 correlation between Kibana managed agent and AZ Worker
 */
export const ALERTZERO_THIN_AGENT_ID = 'alertzero-thin-agent' as const;

/** Managed catalog workflow ids — owned by Security. */
export const SYSTEM_SECURITY_WATCH_FLOOR_ID = 'system-security-watch-floor' as const;
export const SYSTEM_SECURITY_WATCH_OFFICER_ID = 'system-security-watch-officer' as const;
export const SYSTEM_SECURITY_WATCH_DARK_ID = 'system-security-watch-dark' as const;
export const SYSTEM_SECURITY_WATCH_DEEP_ID = 'system-security-watch-deep' as const;
export const SYSTEM_SECURITY_WATCH_DETECTION_ID = 'system-security-watch-detection' as const;

export const SYSTEM_SECURITY_WATCH_IDS = [
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  SYSTEM_SECURITY_WATCH_DARK_ID,
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
 * Presentation metadata for the managed watch catalog.
 *
 * The managed five are compile-time constants, so consumers that must not wait for an HTTP round
 * trip — the app's deep links and the solution navigation tree — build their
 * entries from this list rather than from `list_watches`.
 *
 * Deliberately free of schema and sample imports: both consumers are page-load critical, and pulling
 * `WATCHES_SEED` in would drag Zod and the mock samples into that bundle. Live placeholders and
 * `WATCHES_SEED` both take name, colour and lifecycle from here so the two cannot drift.
 *
 * Custom (unmanaged) watches are absent by construction — they are discoverable only at runtime.
 */
export const SYSTEM_SECURITY_WATCH_CATALOG = [
  {
    id: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    deepLinkId: SecurityPageName.pndWatchFloor,
    name: 'Watch Floor',
    color: '#16b3a6',
  },
  {
    id: SYSTEM_SECURITY_WATCH_OFFICER_ID,
    deepLinkId: SecurityPageName.pndWatchOfficer,
    name: 'Watch Officer',
    color: '#3b82f6',
  },
  {
    id: SYSTEM_SECURITY_WATCH_DARK_ID,
    deepLinkId: SecurityPageName.pndWatchDark,
    name: 'Dark Watch',
    color: '#f59e0b',
    isBeta: true,
  },
  {
    id: SYSTEM_SECURITY_WATCH_DEEP_ID,
    deepLinkId: SecurityPageName.pndWatchDeep,
    name: 'Deep Watch',
    color: '#8b5cf6',
    isBeta: true,
  },
  {
    id: SYSTEM_SECURITY_WATCH_DETECTION_ID,
    deepLinkId: SecurityPageName.pndWatchDetection,
    name: 'Detection Watch',
    color: '#ec4899',
    isBeta: true,
  },
] as const;

export type SystemSecurityWatchCatalogEntry = (typeof SYSTEM_SECURITY_WATCH_CATALOG)[number];

export const WATCH_TAG = 'watch' as const;
export const WATCH_FLOOR_TAG = 'watch-floor' as const;
export const WATCH_OFFICER_TAG = 'watch-officer' as const;
export const WATCH_DARK_TAG = 'watch-dark' as const;
export const WATCH_DEEP_TAG = 'watch-deep' as const;
export const WATCH_DETECTION_TAG = 'watch-detection' as const;

export const WATCH_TIER_TAGS = [
  WATCH_FLOOR_TAG,
  WATCH_OFFICER_TAG,
  WATCH_DARK_TAG,
  WATCH_DEEP_TAG,
  WATCH_DETECTION_TAG,
] as const;

/** Managed Worker workflow ids — tagged Watch members. Dark CTH is the externally settled id. */
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
    watchId: SYSTEM_SECURITY_WATCH_DARK_ID,
    watchTag: WATCH_DARK_TAG,
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

export const TEMPLATE_ID_INVESTIGATION = 'investigation' as const;
export const TEMPLATE_ID_PROPOSAL = 'proposal' as const;
export const TEMPLATE_ID_INCIDENT = 'incident' as const;

export const API_VERSIONS = {
  internal: {
    v1: '1',
  },
} as const;

export const INTERNAL_API_ACCESS = 'internal' as const;

export const CONVERSATION_CATEGORY_COLORS: Record<
  RecommendedAction,
  'danger' | 'warning' | 'accentSecondary' | 'accent'
> = {
  contain: 'danger',
  escalate: 'warning',
  investigate: 'accentSecondary',
  tune: 'accent',
};
