/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import type { RuleMigrationsDataClient } from '../../../data/rule_migrations_data_client';
import { getQradarRulesMigrationTools } from './qradar';
import { getIntegrationSearchTool } from './integrations_search';
import { getProductDocumentationSearchTool } from './product_documentation';

interface RulesMigrationToolDependencies {
  rulesClient: RuleMigrationsDataClient;
  request?: KibanaRequest;
  connectorId?: string;
  llmTasks?: LlmTasksPluginStart;
}

export const getRulesMigrationTools = (
  migrationId: string,
  deps: RulesMigrationToolDependencies
) => {
  const { rulesClient, request, connectorId, llmTasks } = deps;
  return {
    ...getQradarRulesMigrationTools(migrationId, rulesClient),
    ...getProductDocumentationSearchTool({ request, connectorId, llmTasks }),
    ...getIntegrationSearchTool({ rulesClient }),
  };
};

export type RulesMigrationTools = ReturnType<typeof getRulesMigrationTools>;
