/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryEdgeRole, StoryEdgeType } from './types';

export const EXECUTIVE_BRIEF_POC_GENERATE_URL =
  '/internal/entity_analytics/executive_brief/_poc_generate' as const;
export const EXECUTIVE_BRIEF_POC_JOB_URL =
  '/internal/entity_analytics/executive_brief/_poc/{id}' as const;
export const EXECUTIVE_BRIEF_API_VERSION = '1' as const;

/** Per-space hidden plain index holding one document per brief job. */
export const getExecutiveBriefJobsIndex = (spaceId: string): string =>
  `.entity_analytics.executive-briefs.entity-${spaceId}`;

export const MAX_STORYLINES = 3;
export const MAX_STORYLINE_ENTITIES = 8;
export const MAX_STORYLINE_EVENTS = 12;
export const MAX_SEEDS_PER_KIND = 25;
export const MAX_EXPOSURE_LEADERS = 10;
export const MAX_TILE_SAMPLE = 20;

/** Hub guard: degree threshold is max(HUB_MIN_DEGREE, P95 of batch degrees). */
export const HUB_MIN_DEGREE = 15;
export const HUB_EXTREME_CRITICALITY_MIN_DEGREE = 10;

/** Relationship "first seen" events are suppressed when history is shorter than this. */
export const RELATIONSHIP_HISTORY_MIN_DAYS = 3;

/** Attack stage flag thresholds (PLAN §9 Q6a). */
export const LIMITED_COVERAGE_MAX_EFFECTIVE_RULES = 2;
export const LIMITED_COVERAGE_MIN_EFFECTIVE_RATIO = 0.5;

/** Job polling (PoC: fixed interval). */
export const POC_POLL_INTERVAL_MS = 2000;
export const POC_POLL_TIMEOUT_MS = 3 * 60 * 1000;
export const POC_JOB_TIMEOUT_MS = 5 * 60 * 1000;

export interface StoryEdgeConfig {
  weight: number;
  role: StoryEdgeRole;
  /** The only verb the narrative may use for this relation. */
  verb: string;
}

/** Typed edge config (PLAN §3.8). The validator and template generator both use `verb`. */
export const STORY_EDGE_CONFIG: Record<StoryEdgeType, StoryEdgeConfig> = {
  same_ad: { weight: 1.0, role: 'merge', verb: 'part of the same discovered attack' },
  co_alert: { weight: 0.8, role: 'merge', verb: 'appeared together in alerts' },
  owns: { weight: 0.6, role: 'merge', verb: 'owns' },
  administers: { weight: 0.6, role: 'merge', verb: 'administers' },
  accesses_infrequently: { weight: 0.6, role: 'merge', verb: 'logged on to (rarely)' },
  lead_related: { weight: 0.4, role: 'attach', verb: 'related in a hunting lead' },
  accesses_frequently: { weight: 0.3, role: 'attach', verb: 'regularly logs on to' },
  communicates_with: { weight: 0.3, role: 'attach', verb: 'regularly logs on to' },
  supervises: { weight: 0.2, role: 'context', verb: 'manages' },
};

/** Ranking multipliers (PLAN §3.8 step 6). */
export const CRITICALITY_MULTIPLIER: Record<string, number> = {
  extreme_impact: 1.5,
  high_impact: 1.25,
  medium_impact: 1.0,
  low_impact: 0.9,
};
export const RECENCY_HALF_LIFE_DAYS = 7;
export const CORROBORATION_STEP = 0.1;
export const CORROBORATION_MAX = 0.3;
export const CONTAINED_RESPONSE_FACTOR = 0.5;
