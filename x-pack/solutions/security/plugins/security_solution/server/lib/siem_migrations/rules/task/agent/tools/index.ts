/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationsDataClient } from '../../../data/rule_migrations_data_client';
import { getQradarRulesMigrationTools } from './qradar';

interface RulesMigrationToolDependencies {
  rulesClient: RuleMigrationsDataClient;
}

export const getRulesMigrationTools = (
  migrationId: string,
  deps: RulesMigrationToolDependencies
) => {
  const { rulesClient } = deps;
  return { ...getQradarRulesMigrationTools(migrationId, rulesClient) };
};

export type RulesMigrationTools = ReturnType<typeof getRulesMigrationTools>;
