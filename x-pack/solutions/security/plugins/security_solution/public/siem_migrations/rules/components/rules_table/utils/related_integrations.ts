/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RelatedIntegration,
  RuleResponse,
} from '../../../../../../common/api/detection_engine';
import { isMigrationPrebuiltRule } from '../../../../../../common/siem_migrations/rules/utils';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';

/** Resolves the related integrations shown in the translated rules Integrations column. */
export const getRelatedIntegrationsForMigrationRule = ({
  migrationRule,
  matchedPrebuiltRule,
  integrations,
}: {
  migrationRule: Pick<RuleMigrationRule, 'elastic_rule'>;
  matchedPrebuiltRule?: Pick<RuleResponse, 'related_integrations'>;
  integrations?: Record<string, RelatedIntegration>;
}): RelatedIntegration[] => {
  if (isMigrationPrebuiltRule(migrationRule.elastic_rule)) {
    return matchedPrebuiltRule?.related_integrations ?? [];
  }

  const integrationIds = migrationRule.elastic_rule?.integration_ids;
  if (integrations == null || integrationIds == null) {
    return [];
  }

  return integrationIds
    .map((integrationId) => integrations[integrationId])
    .filter((integration): integration is RelatedIntegration => integration != null);
};
