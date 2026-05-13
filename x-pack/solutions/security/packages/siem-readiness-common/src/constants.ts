/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MainCategories } from './types';

// ── API paths ─────────────────────────────────────────────────────────────────
export const GET_SIEM_READINESS_CATEGORIES_API_PATH = '/api/siem_readiness/get_categories';
export const GET_SIEM_READINESS_RETENTION_API_PATH = '/api/siem_readiness/get_retention';
export const GET_SIEM_READINESS_PIPELINES_API_PATH = '/api/siem_readiness/get_pipelines';
export const GET_SIEM_READINESS_QUALITY_API_PATH = '/api/siem_readiness/get_quality';
export const GET_SIEM_READINESS_COVERAGE_API_PATH = '/api/siem_readiness/get_coverage';
export const GET_INDEX_RESULTS_LATEST_API_PATH =
  '/internal/ecs_data_quality_dashboard/results_latest';

// ── Category definitions ──────────────────────────────────────────────────────

/** The five top-level SIEM Readiness categories, in display order. */
export const SIEM_READINESS_CATEGORIES = [
  'Endpoint',
  'Identity',
  'Network',
  'Cloud',
  'Application/SaaS',
] as const satisfies MainCategories[];

export type SiemReadinessCategory = (typeof SIEM_READINESS_CATEGORIES)[number];

/** Alias for backward compatibility with existing consumers. */
export const CATEGORY_ORDER: MainCategories[] = [...SIEM_READINESS_CATEGORIES];
export const ALL_CATEGORIES = CATEGORY_ORDER;

/**
 * Maps each main SIEM Readiness category to the ECS `event.category` values it covers.
 */
export const MAIN_CATEGORY_MAPPING: Record<SiemReadinessCategory, string[]> = {
  Endpoint: [
    'endpoint',
    'file',
    'process',
    'registry',
    'malware',
    'driver',
    'host',
    'vulnerability',
  ],
  Identity: ['authentication', 'iam', 'session', 'user'],
  Network: ['network', 'firewall', 'intrusion_detection', 'dns'],
  Cloud: ['cloud', 'configuration'],
  'Application/SaaS': ['application', 'web', 'database', 'package', 'api'],
};

/** Reverse map: ECS event.category → main SIEM Readiness category. */
export const ECS_CATEGORY_TO_MAIN: Record<string, SiemReadinessCategory> = Object.entries(
  MAIN_CATEGORY_MAPPING
).reduce<Record<string, SiemReadinessCategory>>((acc, [mainCat, ecsCats]) => {
  ecsCats.forEach((c) => {
    acc[c] = mainCat as SiemReadinessCategory;
  });
  return acc;
}, {});

// ── Compliance thresholds ─────────────────────────────────────────────────────

/** FedRAMP minimum data retention requirement (days). */
export const RETENTION_THRESHOLD_DAYS = 365;

// ── Data stream health thresholds ─────────────────────────────────────────────

/** Hours without new data before a data stream is considered silent. */
export const SILENCE_THRESHOLD_HOURS = 24;

// ── Volume drop thresholds ────────────────────────────────────────────────────

/** Drop ≥ this fraction of baseline → "warning". */
export const DROP_WARNING_RATIO = 0.5;

/** Drop ≥ this fraction of baseline → "critical". */
export const DROP_CRITICAL_RATIO = 0.9;

/**
 * Legacy alias kept for backward compatibility.
 * @deprecated Use DROP_WARNING_RATIO instead.
 */
export const DROP_THRESHOLD_RATIO = DROP_WARNING_RATIO;

// ── Ingestion latency SLA (milliseconds) ─────────────────────────────────────

/**
 * Per-category p95 ingestion latency SLA in milliseconds.
 * Source: SOC readiness policy — "event.ingested − event.created p95".
 */
export const LATENCY_SLA_MS: Record<string, number> = {
  Endpoint: 5 * 60 * 1000, // 5 min
  Identity: 5 * 60 * 1000, // 5 min
  Network: 15 * 60 * 1000, // 15 min
  Cloud: 15 * 60 * 1000, // 15 min
  'Application/SaaS': 60 * 60 * 1000, // 1 hour
};

/** Default SLA when the category is unknown. */
export const LATENCY_SLA_DEFAULT_MS = 60 * 60 * 1000; // 1 hour
