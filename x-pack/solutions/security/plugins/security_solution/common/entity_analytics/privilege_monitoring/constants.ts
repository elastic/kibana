/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Static index names: may be more obvious and easier to manage.
export const privilegedMonitorBaseIndexName = '.entity_analytics.monitoring';
export const ML_ANOMALIES_INDEX = '.ml-anomalies-shared';

// Default index for privileged monitoring users.
export const defaultMonitoringUsersIndex = (namespace: string) =>
  `entity_analytics.privileged_monitoring.${namespace}`;
// TODO: this should be index source? If so, can follow pattern outlined below.
// e.g. .entity_analytics.monitoring.sources.index-<space>

// .entity_analytics.monitoring.sources.okta-<space>
export const integrationsSourceIndex = (namespace: string, integrationName: string) =>
  `${privilegedMonitorBaseIndexName}.sources.${integrationName}-${namespace}`;

export const PRIVILEGE_MONITORING_PRIVILEGE_CHECK_API =
  '/api/entity_analytics/monitoring/privileges/privileges';

export const INTEGRATION_TYPES = ['okta', 'ad'] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export const STREAM_INDEX_PATTERNS: Record<IntegrationType, (namespace: string) => string> = {
  okta: (namespace) => `logs-entityanalytics_okta.user-${namespace}`,
  ad: (namespace) => `logs-entityanalytics_ad.user-${namespace}`,
};

export const getStreamPatternFor = (integration: IntegrationType, namespace: string): string =>
  STREAM_INDEX_PATTERNS[integration](namespace);
