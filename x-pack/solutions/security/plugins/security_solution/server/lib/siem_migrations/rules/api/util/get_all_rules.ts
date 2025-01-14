/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationFilters } from '../../../../../../common/siem_migrations/types';
import type { RuleMigration } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../..';

interface GetAllMigrationRulesProps {
  /**
   * The migration id
   */
  migrationId: string;

  /**
   * Filters to use as conditions to get migration rules
   */
  filters?: RuleMigrationFilters;

  /**
   * The security solution context
   */
  securitySolutionContext: SecuritySolutionApiRequestHandlerContext;
}

/**
 * Gets all migration rules based on the filters for a specific migration
 */
export const getAllMigrationRules = async ({
  migrationId,
  filters,
  securitySolutionContext,
}: GetAllMigrationRulesProps): Promise<RuleMigration[]> => {
  const ruleMigrationsClient = securitySolutionContext.getSiemRuleMigrationsClient();

  const batches = ruleMigrationsClient.data.rules.searchBatches(migrationId, { filters });

  const migrationRules: RuleMigration[] = [];
  let results = await batches.next();
  while (results.length) {
    migrationRules.push(...results);
    results = await batches.next();
  }

  return migrationRules;
};
