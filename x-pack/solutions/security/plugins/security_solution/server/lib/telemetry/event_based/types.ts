/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum SiemMigrationsEventTypes {
  MigrationSuccess = 'siem_migrations_migration_success',
  MigrationAborted = 'siem_migrations_migration_aborted',
  MigrationFailure = 'siem_migrations_migration_failure',
  TranslationSuccess = 'siem_migrations_rule_translation_success',
  TranslationFailure = 'siem_migrations_rule_translation_failure',
  PrebuiltRulesMatch = 'siem_migrations_prebuilt_rules_match',
  IntegrationsMatch = 'siem_migrations_integration_match',
}
