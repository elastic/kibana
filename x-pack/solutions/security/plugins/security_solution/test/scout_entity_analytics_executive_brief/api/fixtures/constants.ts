/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_API_HEADERS, tags } from '@kbn/scout-security';
import type { Brief } from '../../../../common/entity_analytics/executive_brief/brief';
import { EXECUTIVE_BRIEF_API_PATH } from '../../../../common/entity_analytics/executive_brief/constants';

/** The brief route in the default space (no leading slash, the apiClient convention). */
export const BRIEF_ROUTE = EXECUTIVE_BRIEF_API_PATH.replace(/^\//, '');

/** The status route under a brief route (default space unless `route` is given). */
export const briefStatusRoute = (route: string = BRIEF_ROUTE): string => `${route}/status`;

/** The brief route in a non-default space. */
export const briefRouteInSpace = (spaceId: string): string => `s/${spaceId}/${BRIEF_ROUTE}`;

export const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  'Content-Type': 'application/json;charset=UTF-8',
  ...INTERNAL_API_HEADERS,
} as const;

/**
 * Stateful classic only: the `entityAnalyticsExecutiveBriefEnabled` flag is set by the
 * `entity_analytics_executive_brief` server config set, which has no serverless variant.
 */
export const EXECUTIVE_BRIEF_TAGS = [...tags.stateful.classic];

export const SUBMIT_BRIEF_TOOL_NAME = 'submit_brief';

export const BRIEF_SIGNAL_IDS = ['attack_discoveries', 'high_risk_entities'] as const;

/**
 * The high-risk entity `seedHighRiskEntity` writes; `id` is its EUID. The signal reports it as
 * fact 1.
 */
export const SEEDED_ENTITY = {
  id: 'user:brief-scout-user',
  name: 'brief-scout-user',
  riskLevel: 'High',
  riskScore: 82,
} as const;

/**
 * A model answer for the seeded high-risk entity: it cites fact 1 at `watch`, which the evidence
 * supports, and mentions the entity by its EUID token, so verification keeps it unchanged. The
 * prose has no other digits or ids, so the number and citation checks have nothing to change.
 */
export const HIGH_RISK_ENTITY_BRIEF: Brief = {
  verdict: {
    level: 'watch',
    headline: 'One user is at high risk and worth monitoring',
    summary: `{{ entity.id ${SEEDED_ENTITY.id} }} is at high risk. No attack discoveries were found in this period.`,
    factIds: [1],
    linkIds: [],
  },
  areas: [
    {
      id: 'threats',
      level: 'watch',
      summary: 'One user is at high risk; no discovered attacks.',
      factIds: [1],
      linkIds: [],
    },
    {
      id: 'response',
      level: 'clear',
      summary: 'Nothing is waiting for a response.',
      factIds: [],
      linkIds: [],
    },
  ],
};
