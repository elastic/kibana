/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationsDataClient } from '../../../../data/rule_migrations_data_client';
import { getResourceByTypeTool } from '../../../../../common/task/agent/tools';
import { getRulesByNameTool } from './rules_by_name';

export const getQradarRulesMigrationTools = (
  migrationId: string,
  rulesClient: RuleMigrationsDataClient
) => {
  return {
    ...getRulesByNameTool(migrationId, rulesClient),
    ...getResourceByTypeTool(migrationId, rulesClient.resources),
  };
};
