/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum SiemMigrationsEventTypes {
  TranslationFailure = 'siem_migrations_rule_translation_failure',
  MigrationSuccess = 'siem_migrations_migration_success',
  PrebuiltRulesMatch = 'siem_migrations_prebuilt_rules_match',
  IntegrationsMatch = 'siem_migrations_integration_match',
  MigrationFailure = 'siem_migrations_migration_failure',
  TranslationSucess = 'siem_migrations_rule_translation_success',
}
