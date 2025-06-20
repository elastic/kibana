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
  /**
   * When new AI Connector is selected
   * */
  SetupConnectorSelected = 'siem_migrations_setup_connector_selected',
  SetupMigrationOpenNew = 'siem_migrations_setup_rules_migration_open_new',
  /**
   * When Rule Resources are uploaded
   */
  SetupMigrationCreated = 'siem_migrations_setup_rules_migration_created',
  /**
   * When a rules migration is deleted
   */
  SetupMigrationDeleted = 'siem_migrations_setup_rules_migration_deleted',
  /**
   * When new rules are uploaded to create a new migration
   */
  SetupResourcesUploaded = 'siem_migrations_setup_rules_resources_uploaded',
  /**
   * When there are open resourced to be uploaded
   */
  SetupMigrationOpenResources = 'siem_migrations_setup_rules_migration_open_resources',
  /*
   * When the query to extract rules is copied
   */
  SetupRulesQueryCopied = 'siem_migrations_setup_rules_query_copied',
  /**
   * When the query to extract macros is copied
   */
  SetupMacrosQueryCopied = 'siem_migrations_setup_rules_macros_query_copied',
  /**
   * When the lookup name is copied
   */
  SetupLookupNameCopied = 'siem_migrations_setup_rules_lookup_name_copied',
  /**
   * When the translation of rules is started
   */
  StartMigration = 'siem_migrations_start_rules_migration',
  /**
   * When the translation of rules is stopped
   */
  StopMigration = 'siem_migrations_stop_rules_migration',
  /**
   * When a translated rule is updated
   */
  TranslatedRuleUpdate = 'siem_migrations_translated_rule_update',
  /**
   * When a translated rule is installed
   */
  TranslatedRuleInstall = 'siem_migrations_translated_rule_install',
  /**
   * When a translated rules are bulk installed
   */
  TranslatedRuleBulkInstall = 'siem_migrations_translated_rule_bulk_install',
}

export interface BaseResultActionParams {
  result: 'success' | 'failed';
  errorMessage?: string;
}

// Setup actions

export interface ReportSetupConnectorSelectedActionParams {
  eventName: string;
  connectorType: string;
  connectorId: string;
}

export interface ReportSetupMigrationOpenNewActionParams {
  eventName: string;
  isFirstMigration: boolean;
}
export interface ReportSetupMigrationOpenResourcesActionParams {
  eventName: string;
  migrationId: string;
  missingResourcesCount: number;
}
export interface ReportSetupRulesQueryCopiedActionParams {
  eventName: string;
  migrationId?: string;
}
export interface ReportSetupMigrationCreatedActionParams extends BaseResultActionParams {
  eventName: string;
  migrationId?: string;
  rulesCount: number;
}
export interface ReportSetupMigrationDeletedActionParams extends BaseResultActionParams {
  eventName: string;
  migrationId: string;
}
export interface ReportSetupMacrosQueryCopiedActionParams {
  eventName: string;
  migrationId: string;
}
export interface ReportSetupLookupNameCopiedActionParams {
  eventName: string;
  migrationId: string;
}
export interface ReportSetupResourcesUploadedActionParams extends BaseResultActionParams {
  eventName: string;
  migrationId: string;
  type: RuleMigrationResourceType;
  count: number;
}

export interface ReportStartMigrationActionParams extends BaseResultActionParams {
  eventName: string;
  migrationId: string;
  connectorId: string;
  skipPrebuiltRulesMatching: boolean;
  isRetry: boolean;
  retryFilter?: SiemMigrationRetryFilter;
}

export interface ReportStopMigrationActionParams extends BaseResultActionParams {
  eventName: string;
  migrationId: string;
}

// Translated rule actions

export interface ReportTranslatedRuleUpdateActionParams {
  eventName: string;
  migrationId: string;
  ruleMigrationId: string;
}

export interface ReportTranslatedRuleInstallActionParams {
  eventName: string;
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
  eventName: string;
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
  [SiemMigrationsEventTypes.SetupMigrationDeleted]: ReportSetupMigrationDeletedActionParams;
  [SiemMigrationsEventTypes.SetupMacrosQueryCopied]: ReportSetupMacrosQueryCopiedActionParams;
  [SiemMigrationsEventTypes.SetupLookupNameCopied]: ReportSetupLookupNameCopiedActionParams;
  [SiemMigrationsEventTypes.SetupResourcesUploaded]: ReportSetupResourcesUploadedActionParams;
  [SiemMigrationsEventTypes.StartMigration]: ReportStartMigrationActionParams;
  [SiemMigrationsEventTypes.StopMigration]: ReportStopMigrationActionParams;
  [SiemMigrationsEventTypes.TranslatedRuleUpdate]: ReportTranslatedRuleUpdateActionParams;
  [SiemMigrationsEventTypes.TranslatedRuleInstall]: ReportTranslatedRuleInstallActionParams;
  [SiemMigrationsEventTypes.TranslatedRuleBulkInstall]: ReportTranslatedRuleBulkInstallActionParams;
}

export interface SiemMigrationsTelemetryEvent {
  eventType: SiemMigrationsEventTypes;
  schema: RootSchema<SiemMigrationsTelemetryEventsMap[SiemMigrationsEventTypes]>;
}
