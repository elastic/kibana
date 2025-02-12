/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';
import type { RuleMigrationResourceType } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { SiemMigrationRetryFilter } from '../../../../../../common/siem_migrations/constants';

export enum SiemMigrationsEventTypes {
  SetupConnectorSelected = 'siem_migrations_setup_connector_selected',
  SetupMigrationOpenNew = 'siem_migrations_setup_rules_migration_open_new',
  SetupMigrationCreated = 'siem_migrations_setup_rules_migration_created',
  SetupResourcesUploaded = 'siem_migrations_setup_rules_resources_uploaded',
  SetupMigrationOpenResources = 'siem_migrations_setup_rules_migration_open_resources',
  SetupRulesQueryCopied = 'siem_migrations_setup_rules_query_copied',
  SetupMacrosQueryCopied = 'siem_migrations_setup_rules_macros_query_copied',
  SetupLookupNameCopied = 'siem_migrations_setup_rules_lookup_name_copied',
  StartTranslation = 'siem_migrations_start_rules_translation',
  TranslatedRuleUpdate = 'siem_migrations_translated_rule_update',
  TranslatedRuleInstall = 'siem_migrations_translated_rule_install',
  TranslatedRuleBulkInstall = 'siem_migrations_translated_rule_bulk_install',
}

export interface BaseResultActionParams {
  result: 'success' | 'failed';
  errorMessage?: string;
}

// Setup actions

export interface ReportSetupConnectorSelectedActionParams {
  connectorType: string;
  connectorId: string;
}

export interface ReportSetupMigrationOpenNewActionParams {
  isFirstMigration: boolean;
}
export interface ReportSetupMigrationOpenResourcesActionParams {
  migrationId: string;
  missingResourcesCount: number;
}
export interface ReportSetupRulesQueryCopiedActionParams {
  migrationId?: string;
}
export interface ReportSetupMigrationCreatedActionParams extends BaseResultActionParams {
  migrationId?: string;
  rulesCount: number;
}
export interface ReportSetupMacrosQueryCopiedActionParams {
  migrationId: string;
}
export interface ReportSetupLookupNameCopiedActionParams {
  migrationId: string;
}
export interface ReportSetupResourcesUploadedActionParams extends BaseResultActionParams {
  migrationId: string;
  type: RuleMigrationResourceType;
  count: number;
}

export interface ReportStartTranslationActionParams extends BaseResultActionParams {
  migrationId: string;
  connectorId: string;
  isRetry: boolean;
  retryFilter?: SiemMigrationRetryFilter;
}

// Translated rule actions

export interface ReportTranslatedRuleUpdateActionParams {
  migrationId: string;
  ruleMigrationId: string;
}

export interface ReportTranslatedRuleInstallActionParams {
  migrationId: string;
  ruleMigrationId: string;
  author: 'elastic' | 'custom';
  enabled: boolean;
  prebuiltRule?: {
    id: string;
    title: string;
  };
}

export interface ReportTranslatedRuleBulkInstallActionParams {
  migrationId: string;
  enabled: boolean;
  count: number;
}

export interface SiemMigrationsTelemetryEventsMap {
  [SiemMigrationsEventTypes.SetupConnectorSelected]: ReportSetupConnectorSelectedActionParams;
  [SiemMigrationsEventTypes.SetupMigrationOpenNew]: ReportSetupMigrationOpenNewActionParams;
  [SiemMigrationsEventTypes.SetupMigrationOpenResources]: ReportSetupMigrationOpenResourcesActionParams;
  [SiemMigrationsEventTypes.SetupRulesQueryCopied]: ReportSetupRulesQueryCopiedActionParams;
  [SiemMigrationsEventTypes.SetupMigrationCreated]: ReportSetupMigrationCreatedActionParams;
  [SiemMigrationsEventTypes.SetupMacrosQueryCopied]: ReportSetupMacrosQueryCopiedActionParams;
  [SiemMigrationsEventTypes.SetupLookupNameCopied]: ReportSetupLookupNameCopiedActionParams;
  [SiemMigrationsEventTypes.SetupResourcesUploaded]: ReportSetupResourcesUploadedActionParams;
  [SiemMigrationsEventTypes.StartTranslation]: ReportStartTranslationActionParams;
  [SiemMigrationsEventTypes.TranslatedRuleUpdate]: ReportTranslatedRuleUpdateActionParams;
  [SiemMigrationsEventTypes.TranslatedRuleInstall]: ReportTranslatedRuleInstallActionParams;
  [SiemMigrationsEventTypes.TranslatedRuleBulkInstall]: ReportTranslatedRuleBulkInstallActionParams;
}

export interface SiemMigrationsTelemetryEvent {
  eventType: SiemMigrationsEventTypes;
  schema: RootSchema<SiemMigrationsTelemetryEventsMap[SiemMigrationsEventTypes]>;
}
