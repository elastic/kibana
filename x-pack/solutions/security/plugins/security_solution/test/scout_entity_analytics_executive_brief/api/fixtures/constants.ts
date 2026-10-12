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
 * What a model should answer for a quiet tenant: `clear` everywhere and no citations. The test
 * cluster has no attack discoveries or risk scores, so verification keeps it unchanged. The prose
 * has no digits, so the number check has nothing to drop.
 */
export const QUIET_TENANT_BRIEF: Brief = {
  verdict: {
    level: 'clear',
    headline: 'Nothing in this period needs your attention',
    summary: 'No attack discoveries or high-risk entities were found in this period.',
    evidence: [],
  },
  areas: [
    {
      id: 'threats',
      level: 'clear',
      summary: 'No discovered attacks or high-risk entities.',
      evidence: [],
    },
    {
      id: 'response',
      level: 'clear',
      summary: 'Nothing is waiting for a response.',
      evidence: [],
    },
  ],
};
