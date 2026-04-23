/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Matcher,
  MonitoringEntitySourceType,
} from '../../../../../common/api/entity_analytics';
import type { IntegrationType } from './constants';
import { INTEGRATION_TYPES } from './constants';

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

// If updating matchers, bump MANAGED_SOURCES_VERSION in monitoring_entity_source_type.ts
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

const normalizeMatchers = (matchers: Matcher[] = []) =>
  matchers
    .map((matcher) => ({
      fields: [...(matcher.fields ?? [])].sort(),
      values: [...(matcher.values ?? [])].sort(),
    }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

export const areMatchersEqual = (a?: Matcher[], b?: Matcher[]) =>
  JSON.stringify(normalizeMatchers(a)) === JSON.stringify(normalizeMatchers(b));

const isIntegrationType = (value?: string): value is IntegrationType =>
  Boolean(value && INTEGRATION_TYPES.includes(value as IntegrationType));

export const getDefaultMatchersForIntegration = (integrationName?: string): Matcher[] | undefined =>
  isIntegrationType(integrationName) ? getMatchersFor(integrationName) : undefined;

export const getDefaultMatchersForSource = (
  sourceType?: MonitoringEntitySourceType,
  integrationName?: string
): Matcher[] | undefined => {
  if (sourceType === 'index') {
    return [];
  }

  return getDefaultMatchersForIntegration(integrationName);
};
