/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Test fixtures for the Detection Engine v2 Scout suite.
 *
 * Re-exports the base Scout `apiTest` fixture and adds detection-specific
 * helpers: roles, URL builders, and rule body factories.
 *
 * Role grant rationale:
 *   The Detection API routes declare `requiredPrivileges: ['rules-all']` and
 *   `['rules-read']`.  These strings are Kibana API privileges granted by the
 *   `securitySolutionRulesV4` feature:
 *     - `all` privilege → grants `rules-all` + `rules-read`
 *     - `read` privilege → grants `rules-read` only
 *   A role that does not include the feature grants neither.
 */

import { apiTest as baseApiTest } from '@kbn/scout-security';
import type { KibanaRole } from '@kbn/scout-security';

export { expect } from '@kbn/scout-security/api';
export { apiTest as baseApiTest } from '@kbn/scout-security';

// Re-export the base fixture as-is; detection tests do not need custom apiServices.
export const apiTest = baseApiTest;

// ---------------------------------------------------------------------------
// API paths
// ---------------------------------------------------------------------------

/** Base path for every Detection Engine v2 route. */
export const DETECTION_V2_BASE = '/api/detection_engine/v2';
/** Rules collection path. */
export const DETECTION_V2_RULES = `${DETECTION_V2_BASE}/rules`;
/** Single rule path. */
export const getDetectionRuleUrl = (id: string) =>
  `${DETECTION_V2_RULES}/${encodeURIComponent(id)}`;
/** Enable action path. */
export const getDetectionEnableUrl = (id: string) => `${getDetectionRuleUrl(id)}/_enable`;
/** Disable action path. */
export const getDetectionDisableUrl = (id: string) => `${getDetectionRuleUrl(id)}/_disable`;
/** Tags aggregation path. */
export const DETECTION_V2_TAGS = `${DETECTION_V2_BASE}/tags`;

/** Headers required by every Detection Engine v2 request. */
export const DETECTION_HEADERS = {
  'kbn-xsrf': 'scout-test',
  'Content-Type': 'application/json;charset=UTF-8',
} as const;

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

const WRITER_ES_PRIVILEGES: KibanaRole['elasticsearch'] = {
  cluster: ['all'],
  indices: [{ names: ['*'], privileges: ['all'] }],
};

const READER_ES_PRIVILEGES: KibanaRole['elasticsearch'] = {
  cluster: ['monitor'],
  indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
};

const NO_ACCESS_ES_PRIVILEGES: KibanaRole['elasticsearch'] = {
  cluster: [],
  indices: [],
};

/**
 * Grants `rules-all` + `rules-read` via the `securitySolutionRulesV4` feature.
 * Use for tests that call mutating Detection API endpoints.
 */
export const DETECTION_RULES_ALL_ROLE: KibanaRole = {
  elasticsearch: WRITER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        // securitySolutionRulesV4 all → RULES_API_ALL + RULES_API_READ
        securitySolutionRulesV4: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

/**
 * Grants `rules-read` only via the `securitySolutionRulesV4` feature.
 * Use for tests that call read-only Detection API endpoints.
 */
export const DETECTION_RULES_READ_ROLE: KibanaRole = {
  elasticsearch: READER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        securitySolutionRulesV4: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

/**
 * No alerting/rules privileges at all.
 * Use to assert that both mutating and read endpoints reject the caller.
 */
export const NO_ACCESS_ROLE: KibanaRole = {
  elasticsearch: NO_ACCESS_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        advancedSettings: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

// ---------------------------------------------------------------------------
// Rule body factories
// ---------------------------------------------------------------------------

/** Minimal valid custom-query detection rule create payload. */
export interface BuildQueryRuleInput {
  name?: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  risk_score?: number;
  index?: string[];
  query?: string;
  rule_id?: string;
  tags?: string[];
  enabled?: boolean;
}

export const buildQueryRule = (input: BuildQueryRuleInput = {}) => ({
  type: 'query' as const,
  name: input.name ?? 'scout-detection-rule',
  description: input.description ?? 'A Scout detection rule',
  severity: input.severity ?? ('low' as const),
  risk_score: input.risk_score ?? 21,
  index: input.index ?? ['logs-*'],
  query: input.query ?? '*',
  ...(input.rule_id !== undefined ? { rule_id: input.rule_id } : {}),
  ...(input.tags !== undefined ? { tags: input.tags } : {}),
  ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
});

/** Minimal valid threshold detection rule create payload. */
export interface BuildThresholdRuleInput {
  name?: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  risk_score?: number;
  index?: string[];
  query?: string;
  threshold?: { field: string[]; value: number };
  rule_id?: string;
  enabled?: boolean;
}

export const buildThresholdRule = (input: BuildThresholdRuleInput = {}) => ({
  type: 'threshold' as const,
  name: input.name ?? 'scout-threshold-rule',
  description: input.description ?? 'A Scout threshold rule',
  severity: input.severity ?? ('low' as const),
  risk_score: input.risk_score ?? 21,
  index: input.index ?? ['logs-*'],
  query: input.query ?? '',
  threshold: input.threshold ?? { field: ['host.name'], value: 10 },
  ...(input.rule_id !== undefined ? { rule_id: input.rule_id } : {}),
  ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
});
