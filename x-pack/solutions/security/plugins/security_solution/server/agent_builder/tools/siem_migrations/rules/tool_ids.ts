/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { securityTool } from '../../constants';

/**
 * Tool ids for the SIEM Migration agent builder tools.
 *
 * Namespaced `security.siem_migration.*` per the issue convention: the migration type
 * is embedded in the id so calls are self-documenting and unique in the tool registry.
 */
export const SIEM_MIGRATION_GET_RULE_MIGRATION_TOOL_ID = securityTool(
  'siem_migration.get_rule_migration'
);
export const SIEM_MIGRATION_START_RULE_MIGRATION_TOOL_ID = securityTool(
  'siem_migration.start_rule_migration'
);
export const SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID = securityTool(
  'siem_migration.get_all_rule_migration_stats'
);
export const SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID = securityTool(
  'siem_migration.get_migration_rules'
);
export const SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID = securityTool(
  'siem_migration.get_rule_migration_stats'
);
export const SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID = securityTool(
  'siem_migration.get_rule_migration_translation_stats'
);
