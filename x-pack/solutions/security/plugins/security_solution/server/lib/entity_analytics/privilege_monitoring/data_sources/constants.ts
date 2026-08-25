/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PRIVMON_BASE_INDEX_NAME } from '../../../../../common/constants';

// .entity_analytics.monitoring.sources.entityanalytics_okta-<space>
export const integrationsSourceIndex = (namespace: string, integrationName: string) =>
  `${PRIVMON_BASE_INDEX_NAME}.sources.${integrationName}-${namespace}`;

export const INTEGRATION_TYPES = ['entityanalytics_okta', 'entityanalytics_ad'] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export const STREAM_INDEX_PATTERNS: Record<IntegrationType, (namespace: string) => string> = {
  entityanalytics_okta: (namespace) => `logs-entityanalytics_okta.user-${namespace}`,
  entityanalytics_ad: (namespace) => `logs-entityanalytics_ad.user-${namespace}`,
};

export const getStreamPatternFor = (integration: IntegrationType, namespace: string): string =>
  STREAM_INDEX_PATTERNS[integration](namespace);

export const oktaLastFullSyncMarkersIndex = (namespace: string) =>
  `logs-entityanalytics_okta.entity-${namespace}`;
