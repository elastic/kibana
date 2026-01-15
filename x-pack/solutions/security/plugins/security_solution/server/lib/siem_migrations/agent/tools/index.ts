/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  createSiemMigrationsClientFactory,
  createSecuritySolutionContextFactory,
  type SiemMigrationsClientGetter,
  type SecuritySolutionContextGetter,
} from './create_client_factory';

import { createGetMigrationsTool, SIEM_MIGRATION_GET_MIGRATIONS_TOOL_ID } from './get_migrations';

import {
  createGetMigrationRulesTool,
  SIEM_MIGRATION_GET_RULES_TOOL_ID,
} from './get_migration_rules';

import {
  createUpdateMigrationRuleTool,
  SIEM_MIGRATION_UPDATE_RULE_TOOL_ID,
} from './update_migration_rule';

import {
  createInstallMigrationRulesTool,
  SIEM_MIGRATION_INSTALL_RULES_TOOL_ID,
} from './install_migration_rules';

import {
  createStartMigrationTool,
  SIEM_MIGRATION_START_MIGRATION_TOOL_ID,
} from './start_migration';

// All SIEM migration tool IDs for agent configuration
export const SIEM_MIGRATION_TOOL_IDS = [
  SIEM_MIGRATION_GET_MIGRATIONS_TOOL_ID,
  SIEM_MIGRATION_GET_RULES_TOOL_ID,
  SIEM_MIGRATION_UPDATE_RULE_TOOL_ID,
  SIEM_MIGRATION_INSTALL_RULES_TOOL_ID,
  SIEM_MIGRATION_START_MIGRATION_TOOL_ID,
];

export {
  createGetMigrationsTool,
  createGetMigrationRulesTool,
  createUpdateMigrationRuleTool,
  createInstallMigrationRulesTool,
  createStartMigrationTool,
};
