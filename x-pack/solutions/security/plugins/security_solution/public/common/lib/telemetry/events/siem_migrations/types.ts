/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';
import type { SiemMigrationResourceType } from '../../../../../../common/siem_migrations/model/common.gen';
import type { SiemMigrationRetryFilter } from '../../../../../../common/siem_migrations/constants';
import type { SiemMigrationVendor } from '../../../../../../common/siem_migrations/types';

export enum SiemMigrationsDashboardEventTypes {
  SetupConnectorSelected = 'siem_migrations_dashboard_setup_connector_selected',
  SetupMigrationOpenNew = 'siem_migrations_dashboard_setup_migration_open_new',
  SetupMigrationCreated = 'siem_migrations_dashboard_setup_migration_created',
  SetupMigrationDeleted = 'siem_migrations_dashboard_setup_migration_deleted',
  SetupResourcesUploaded = 'siem_migrations_dashboard_setup_resources_uploaded',
  SetupMigrationOpenResources = 'siem_migrations_dashboard_setup_migration_open_resources',
  SetupQueryCopied = 'siem_migrations_dashboard_setup_query_copied',
  SetupMacrosQueryCopied = 'siem_migrations_dashboard_setup_macros_query_copied',
  SetupLookupNameCopied = 'siem_migrations_dashboard_setup_lookup_name_copied',
  StartMigration = 'siem_migrations_dashboard_start_migration',
  StopMigration = 'siem_migrations_dashboard_stop_migration',
  TranslatedItemUpdate = 'siem_migrations_dashboard_translated_dashboard_update',
  TranslatedItemInstall = 'siem_migrations_dashboard_translated_dashboard_install',
  TranslatedBulkInstall = 'siem_migrations_dashboard_translated_dashboard_bulk_install',
}

export enum SiemMigrationsRuleEventTypes {
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
  SetupQueryCopied = 'siem_migrations_setup_rules_query_copied',
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
  TranslatedItemUpdate = 'siem_migrations_translated_rule_update',
  /**
   * When a translated rule is installed
   */
  TranslatedItemInstall = 'siem_migrations_translated_rule_install',
  /**
   * When a translated rules are bulk installed
   */
  TranslatedBulkInstall = 'siem_migrations_translated_rule_bulk_install',
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
  vendor?: SiemMigrationVendor;
}
export interface ReportSetupQueryCopiedActionParams {
  eventName: string;
  migrationId?: string;
  vendor?: SiemMigrationVendor;
}
export interface ReportSetupMigrationCreatedActionParams extends BaseResultActionParams {
  eventName: string;
  migrationId?: string;
  count: number;
  vendor?: SiemMigrationVendor;
}
export interface ReportSetupMigrationDeletedActionParams extends BaseResultActionParams {
  eventName: string;
  migrationId: string;
  vendor?: SiemMigrationVendor;
}
export interface ReportSetupMacrosQueryCopiedActionParams {
  eventName: string;
  migrationId: string;
  vendor?: SiemMigrationVendor;
}
export interface ReportSetupLookupNameCopiedActionParams {
  eventName: string;
  migrationId: string;
  vendor?: SiemMigrationVendor;
}
export interface ReportSetupResourcesUploadedActionParams extends BaseResultActionParams {
  eventName: string;
  migrationId: string;
  vendor?: SiemMigrationVendor;
  type: SiemMigrationResourceType;
  count: number;
}

export interface ReportStartMigrationActionParams extends BaseResultActionParams {
  eventName: string;
  migrationId: string;
  vendor?: SiemMigrationVendor;
  connectorId: string;
  skipPrebuiltRulesMatching: boolean;
  isRetry: boolean;
  retryFilter?: SiemMigrationRetryFilter;
}

export interface ReportStopMigrationActionParams extends BaseResultActionParams {
  eventName: string;
  migrationId: string;
  vendor?: SiemMigrationVendor;
}

// Translated rule actions

export interface ReportTranslatedItemUpdateActionParams {
  eventName: string;
  migrationId: string;
  ruleMigrationId: string;
  vendor?: SiemMigrationVendor;
}

export interface ReportTranslatedItemInstallActionParams {
  eventName: string;
  migrationId: string;
  vendor?: SiemMigrationVendor;
  ruleMigrationId: string;
  author: 'elastic' | 'custom';
  enabled: boolean;
  prebuiltRule?: {
    id: string;
    title: string;
  };
}

export interface ReportTranslatedItemBulkInstallActionParams {
  eventName: string;
  migrationId: string;
  enabled: boolean;
  vendor?: SiemMigrationVendor;
  count: number;
}

export interface SiemMigrationsTelemetryEventsMap {
  [SiemMigrationsRuleEventTypes.SetupConnectorSelected]: ReportSetupConnectorSelectedActionParams;
  [SiemMigrationsRuleEventTypes.SetupMigrationOpenNew]: ReportSetupMigrationOpenNewActionParams;
  [SiemMigrationsRuleEventTypes.SetupMigrationOpenResources]: ReportSetupMigrationOpenResourcesActionParams;
  [SiemMigrationsRuleEventTypes.SetupQueryCopied]: ReportSetupQueryCopiedActionParams;
  [SiemMigrationsRuleEventTypes.SetupMigrationCreated]: ReportSetupMigrationCreatedActionParams;
  [SiemMigrationsRuleEventTypes.SetupMigrationDeleted]: ReportSetupMigrationDeletedActionParams;
  [SiemMigrationsRuleEventTypes.SetupMacrosQueryCopied]: ReportSetupMacrosQueryCopiedActionParams;
  [SiemMigrationsRuleEventTypes.SetupLookupNameCopied]: ReportSetupLookupNameCopiedActionParams;
  [SiemMigrationsRuleEventTypes.SetupResourcesUploaded]: ReportSetupResourcesUploadedActionParams;
  [SiemMigrationsRuleEventTypes.StartMigration]: ReportStartMigrationActionParams;
  [SiemMigrationsRuleEventTypes.StopMigration]: ReportStopMigrationActionParams;
  [SiemMigrationsRuleEventTypes.TranslatedItemUpdate]: ReportTranslatedItemUpdateActionParams;
  [SiemMigrationsRuleEventTypes.TranslatedItemInstall]: ReportTranslatedItemInstallActionParams;
  [SiemMigrationsRuleEventTypes.TranslatedBulkInstall]: ReportTranslatedItemBulkInstallActionParams;
  [SiemMigrationsDashboardEventTypes.SetupConnectorSelected]: ReportSetupConnectorSelectedActionParams;
  [SiemMigrationsDashboardEventTypes.SetupMigrationOpenNew]: ReportSetupMigrationOpenNewActionParams;
  [SiemMigrationsDashboardEventTypes.SetupMigrationOpenResources]: ReportSetupMigrationOpenResourcesActionParams;
  [SiemMigrationsDashboardEventTypes.SetupQueryCopied]: ReportSetupQueryCopiedActionParams;
  [SiemMigrationsDashboardEventTypes.SetupMigrationCreated]: ReportSetupMigrationCreatedActionParams;
  [SiemMigrationsDashboardEventTypes.SetupMigrationDeleted]: ReportSetupMigrationDeletedActionParams;
  [SiemMigrationsDashboardEventTypes.SetupMacrosQueryCopied]: ReportSetupMacrosQueryCopiedActionParams;
  [SiemMigrationsDashboardEventTypes.SetupLookupNameCopied]: ReportSetupLookupNameCopiedActionParams;
  [SiemMigrationsDashboardEventTypes.SetupResourcesUploaded]: ReportSetupResourcesUploadedActionParams;
  [SiemMigrationsDashboardEventTypes.StartMigration]: ReportStartMigrationActionParams;
  [SiemMigrationsDashboardEventTypes.StopMigration]: ReportStopMigrationActionParams;
  [SiemMigrationsDashboardEventTypes.TranslatedItemUpdate]: ReportTranslatedItemUpdateActionParams;
  [SiemMigrationsDashboardEventTypes.TranslatedItemInstall]: ReportTranslatedItemInstallActionParams;
  [SiemMigrationsDashboardEventTypes.TranslatedBulkInstall]: ReportTranslatedItemBulkInstallActionParams;
}

export interface SiemMigrationsTelemetryEvent {
  eventType: SiemMigrationsRuleEventTypes;
  schema: RootSchema<
    SiemMigrationsTelemetryEventsMap[
      | SiemMigrationsRuleEventTypes
      | SiemMigrationsDashboardEventTypes]
  >;
}
