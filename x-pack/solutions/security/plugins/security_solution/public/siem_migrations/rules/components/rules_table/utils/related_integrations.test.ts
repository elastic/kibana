/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelatedIntegration } from '../../../../../../common/api/detection_engine';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { getRelatedIntegrationsForMigrationRule } from './related_integrations';

const apacheIntegration: RelatedIntegration = { package: 'apache', version: '^1.0.0' };
const nginxIntegration: RelatedIntegration = {
  package: 'nginx',
  version: '^1.0.0',
  integration: 'access',
};

const prebuiltMigrationRule: Pick<RuleMigrationRule, 'elastic_rule'> = {
  elastic_rule: {
    title: 'Web Server Potential Spike in Error Response Codes',
    description: 'Detects a spike in web server error response codes.',
    prebuilt_rule_id: 'prebuilt-1',
    severity: 'low',
    risk_score: 21,
  },
};

const customMigrationRule: Pick<RuleMigrationRule, 'elastic_rule'> = {
  elastic_rule: {
    title: 'Custom translated rule',
    description: 'A custom translation.',
    query: 'FROM logs-*',
    query_language: 'esql',
    severity: 'low',
    risk_score: 21,
    integration_ids: ['apache', 'missing-package'],
  },
};

describe('getRelatedIntegrationsForMigrationRule', () => {
  it('returns the matched prebuilt rule related integrations when integration ids are absent', () => {
    const relatedIntegrations = getRelatedIntegrationsForMigrationRule({
      migrationRule: prebuiltMigrationRule,
      matchedPrebuiltRule: { related_integrations: [apacheIntegration, nginxIntegration] },
    });

    expect(relatedIntegrations).toEqual([apacheIntegration, nginxIntegration]);
  });

  it('returns the matched prebuilt rule related integrations when those packages are absent from the catalog', () => {
    const relatedIntegrations = getRelatedIntegrationsForMigrationRule({
      migrationRule: prebuiltMigrationRule,
      matchedPrebuiltRule: { related_integrations: [apacheIntegration, nginxIntegration] },
      integrations: {},
    });

    expect(relatedIntegrations).toEqual([apacheIntegration, nginxIntegration]);
  });

  it('returns an empty list when the matched prebuilt rule has no related integrations', () => {
    const relatedIntegrations = getRelatedIntegrationsForMigrationRule({
      migrationRule: prebuiltMigrationRule,
      matchedPrebuiltRule: { related_integrations: [] },
      integrations: { apache: apacheIntegration },
    });

    expect(relatedIntegrations).toEqual([]);
  });

  it('falls back to stored integration ids when the matched prebuilt rule is unavailable', () => {
    const relatedIntegrations = getRelatedIntegrationsForMigrationRule({
      migrationRule: {
        elastic_rule: {
          ...prebuiltMigrationRule.elastic_rule,
          integration_ids: ['apache', 'missing-package'],
        },
      },
      integrations: { apache: apacheIntegration },
    });

    expect(relatedIntegrations).toEqual([apacheIntegration]);
  });

  it('resolves custom rule integration ids through the catalog and drops unknown ids', () => {
    const relatedIntegrations = getRelatedIntegrationsForMigrationRule({
      migrationRule: customMigrationRule,
      integrations: { apache: apacheIntegration },
    });

    expect(relatedIntegrations).toEqual([apacheIntegration]);
  });
});
