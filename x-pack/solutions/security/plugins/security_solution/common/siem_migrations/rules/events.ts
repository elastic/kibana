/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SIEM_MIGRATION_RULE_UPDATED_TOOL_EVENT = 'siem_migration_rule_updated' as const;

export interface SiemMigrationRuleUpdatedToolEventData {
  migrationId: string;
  ruleId: string;
}
