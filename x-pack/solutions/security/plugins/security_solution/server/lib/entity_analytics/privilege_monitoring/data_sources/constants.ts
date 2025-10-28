/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Matcher } from '../../../../../common/api/entity_analytics';
import { PRIVMON_BASE_INDEX_NAME } from '../../../../../common/constants';

export const OKTA_ADMIN_ROLES: string[] = [
  'Super Administrator',
  'Organization Administrator',
  'Group Administrator',
  'Application Administrator',
  'Mobile Administrator',
  'Help Desk Administrator',
  'Report Administrator',
  'API Access Management Administrator',
  'Group Membership Administrator',
  'Read-only Administrator',
];

export const AD_ADMIN_ROLES: string[] = ['Domain Admins', 'Enterprise Admins'];

export const INTEGRATION_MATCHERS_DETAILED: Record<IntegrationType, Matcher> = {
  entityanalytics_okta: { fields: ['user.roles'], values: OKTA_ADMIN_ROLES },
  // ad: { fields: ['user.roles'], values: AD_ADMIN_ROLES },
};

export const getMatchersFor = (integration: IntegrationType): Matcher[] => [
  INTEGRATION_MATCHERS_DETAILED[integration],
];
// TODO: this should be index source? If so, can follow pattern outlined below.
// e.g. .entity_analytics.monitoring.sources.index-<space>

// .entity_analytics.monitoring.sources.entityanalytics_okta-<space>
export const integrationsSourceIndex = (namespace: string, integrationName: string) =>
  `${PRIVMON_BASE_INDEX_NAME}.sources.${integrationName}-${namespace}`;

export const PRIVILEGE_MONITORING_PRIVILEGE_CHECK_API =
  '/api/entity_analytics/monitoring/privileges/privileges';

export const INTEGRATION_TYPES = ['entityanalytics_okta' /* 'ad'*/] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export const STREAM_INDEX_PATTERNS: Record<IntegrationType, (namespace: string) => string> = {
  entityanalytics_okta: (namespace) => `logs-entityanalytics_okta.user-${namespace}`,
  // ad: (namespace) => `logs-entityanalytics_ad.user-${namespace}`,
};

export const getStreamPatternFor = (integration: IntegrationType, namespace: string): string =>
  STREAM_INDEX_PATTERNS[integration](namespace);

export const oktaLastFullSyncMarkersIndex = (namespace: string) =>
  `logs-entityanalytics_okta.entity-${namespace}`;
