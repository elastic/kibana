/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PND_FEATURE_ID = 'pnd' as const;
export const PND_PLUGIN_NAME = 'PND' as const;
export const PND_APP_ID = 'pnd' as const;
export const PND_APP_PATH = '/app/pnd' as const;

export const PND_INTERNAL_URL = '/internal/pnd' as const;

export const PND_WATCHES_URL = `${PND_INTERNAL_URL}/watches` as const;
export const PND_WATCH_URL_TEMPLATE = `${PND_WATCHES_URL}/{watchId}` as const;

export const buildWatchUrl = (watchId: string) =>
  `${PND_WATCHES_URL}/${encodeURIComponent(watchId)}`;

export const PND_INVESTIGATIONS_URL = `${PND_INTERNAL_URL}/investigations` as const;
export const PND_INVESTIGATION_URL_TEMPLATE = `${PND_INVESTIGATIONS_URL}/{id}` as const;

export const buildInvestigationUrl = (id: string) =>
  `${PND_INVESTIGATIONS_URL}/${encodeURIComponent(id)}`;

export const PND_INVESTIGATION_PROPOSALS_URL_TEMPLATE =
  `${PND_INVESTIGATIONS_URL}/{id}/proposals` as const;

export const buildInvestigationProposalsUrl = (id: string) =>
  `${PND_INVESTIGATIONS_URL}/${encodeURIComponent(id)}/proposals`;

/**
 * Shared thin PND agent for all Watch Orchestrator / Worker `ai.agent` steps.
 * Can expand this to multiple scoped thin agents in the future if needed.
 * Prefer avoiding 1-1 correlation between Kibana managed agent and Watch Orchestrator / Worker
 */
export const PND_THIN_AGENT_ID = 'pnd-thin-agent' as const;

/** Managed catalog workflow ids — owned by Security. */
export const SYSTEM_SECURITY_WATCH_FLOOR_ID = 'system-security-watch-floor' as const;
export const SYSTEM_SECURITY_WATCH_OFFICER_ID = 'system-security-watch-officer' as const;
export const SYSTEM_SECURITY_WATCH_DARK_ID = 'system-security-watch-dark' as const;
export const SYSTEM_SECURITY_WATCH_DEEP_ID = 'system-security-watch-deep' as const;

export const SYSTEM_SECURITY_WATCH_IDS = [
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
] as const;

export const WATCH_TAG = 'watch' as const;
export const WATCH_FLOOR_TAG = 'watch-floor' as const;
export const WATCH_OFFICER_TAG = 'watch-officer' as const;
export const WATCH_DARK_TAG = 'watch-dark' as const;
export const WATCH_DEEP_TAG = 'watch-deep' as const;
export const WATCH_CUSTOM_TAG = 'watch-custom' as const;

export const WATCH_TIER_TAGS = [
  WATCH_FLOOR_TAG,
  WATCH_OFFICER_TAG,
  WATCH_DARK_TAG,
  WATCH_DEEP_TAG,
] as const;

export const TEMPLATE_ID_INVESTIGATION = 'investigation' as const;
export const TEMPLATE_ID_PROPOSAL = 'proposal' as const;
export const TEMPLATE_ID_INCIDENT = 'incident' as const;

export const TEMPLATE_IDS = [
  TEMPLATE_ID_INVESTIGATION,
  TEMPLATE_ID_PROPOSAL,
  TEMPLATE_ID_INCIDENT,
] as const;

export const API_VERSIONS = {
  internal: {
    v1: '1',
  },
} as const;

export const INTERNAL_API_ACCESS = 'internal' as const;

export const RECOMMENDED_ACTIONS = ['contain', 'escalate', 'investigate', 'tune'] as const;

export const PROPOSAL_STATUSES = [
  'pending',
  'approved',
  'modified',
  'dismissed',
  'executed',
] as const;
