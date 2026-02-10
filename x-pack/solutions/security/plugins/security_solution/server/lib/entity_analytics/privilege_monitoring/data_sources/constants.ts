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

export const INTEGRATION_MATCHERS_DETAILED: Record<IntegrationType, Matcher> = {
  entityanalytics_okta: { fields: ['user.roles'], values: OKTA_ADMIN_ROLES },
  // Well-known Active Directory SIDs (RID → privilege mapping)
  // https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers#well-known-sids
  //
  // The `entityanalytics_ad.user.privileged_group_member` field is derived by the
  // Active Directory integration based on membership in these privileged groups.
  // See integration ingest pipeline for the source logic:
  // https://github.com/efd6/integrations/blob/6e05cf38a6cd42ba88cae09aa22b1696886c956f/packages/entityanalytics_ad/data_stream/user/elasticsearch/ingest_pipeline/entity.yml#L329C1-L380C1
  entityanalytics_ad: {
    fields: ['entityanalytics_ad.user.privileged_group_member'],
    values: [true],
  },
};

export const getMatchersFor = (integration: IntegrationType): Matcher[] => [
  INTEGRATION_MATCHERS_DETAILED[integration],
];

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
