/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';
import type { SiemMigrationRetryFilter } from '../../../../../../common/siem_migrations/constants';

export enum SiemMigrationsEventTypes {
  SetupConnectorSelected = '[SIEM_Migrations] Setup connector selected',
  SetupMigrationOpenNew = '[SIEM_Migrations] Setup rule migration opened',
  SetupMigrationOpenUpload = '[SIEM_Migrations] Setup rule migration opened upload',
  SetupRulesQueryCopied = '[SIEM_Migrations] Setup rules query copied',
  SetupRulesUploaded = '[SIEM_Migrations] Setup rules uploaded',
  SetupMacrosQueryCopied = '[SIEM_Migrations] Setup macros query copied',
  SetupMacrosUploaded = '[SIEM_Migrations] Setup macros uploaded',
  SetupLookupsQueryCopied = '[SIEM_Migrations] Setup lookups query copied',
  SetupLookupsUploaded = '[SIEM_Migrations] Setup lookups uploaded',
  StartTranslation = '[SIEM_Migrations] Start translation',
  TranslatedRuleUpdate = '[SIEM_Migrations] Translated rule update',
  TranslatedRuleInstall = '[SIEM_Migrations] Translated rule install',
  TranslatedRuleBulkInstall = '[SIEM_Migrations] Translated rule bulk install',
}

export interface BaseResultActionParams {
  result: 'success' | 'failed';
  errorMessage?: string;
}
export interface BaseTranslatedRuleActionParams extends BaseResultActionParams {
  migrationId: string;
}

// Setup actions

interface ReportSetupConnectorSelectedActionParams {
  connectorType: string;
  connectorId: string;
}

interface ReportSetupMigrationOpenNewActionParams {
  isFirstMigration: boolean;
}
interface ReportSetupMigrationOpenUploadActionParams {
  migrationId: string;
  missingResourcesCount: number;
}
interface ReportSetupRulesQueryCopiedActionParams {
  connectorId: string;
}
interface ReportSetupRulesUploadedActionParams extends BaseResultActionParams {
  connectorId: string;
  count: number;
}
interface ReportSetupMacrosQueryCopiedActionParams {
  migrationId: string;
}
interface ReportSetupMacrosUploadedActionParams extends BaseResultActionParams {
  migrationId: string;
  count: number;
}
interface ReportSetupLookupsQueryCopiedActionParams {
  migrationId: string;
  lookupName: string;
}
interface ReportSetupLookupsUploadedActionParams extends BaseResultActionParams {
  migrationId: string;
  count: number;
}

interface ReportStartTranslationActionParams extends BaseResultActionParams {
  migrationId: string;
  connectorId: string;
  isRetry: boolean;
  retryFilter?: SiemMigrationRetryFilter;
}

// Translated rule actions

interface ReportTranslatedRuleUpdateActionParams {
  migrationId: string;
  ruleMigrationId: string;
}

interface ReportTranslatedRuleInstallActionParams {
  migrationId: string;
  ruleMigrationId: string;
  author: 'elastic' | 'custom';
  enabled: boolean;
  prebuiltRule?: {
    id: string;
    title: string;
  };
}

interface ReportTranslatedRuleBulkInstallActionParams {
  migrationId: string;
  enabled: boolean;
  count: number;
}

export interface SiemMigrationsTelemetryEventsMap {
  [SiemMigrationsEventTypes.SetupConnectorSelected]: ReportSetupConnectorSelectedActionParams;
  [SiemMigrationsEventTypes.SetupMigrationOpenNew]: ReportSetupMigrationOpenNewActionParams;
  [SiemMigrationsEventTypes.SetupMigrationOpenUpload]: ReportSetupMigrationOpenUploadActionParams;
  [SiemMigrationsEventTypes.SetupRulesQueryCopied]: ReportSetupRulesQueryCopiedActionParams;
  [SiemMigrationsEventTypes.SetupRulesUploaded]: ReportSetupRulesUploadedActionParams;
  [SiemMigrationsEventTypes.SetupMacrosQueryCopied]: ReportSetupMacrosQueryCopiedActionParams;
  [SiemMigrationsEventTypes.SetupMacrosUploaded]: ReportSetupMacrosUploadedActionParams;
  [SiemMigrationsEventTypes.SetupLookupsQueryCopied]: ReportSetupLookupsQueryCopiedActionParams;
  [SiemMigrationsEventTypes.SetupLookupsUploaded]: ReportSetupLookupsUploadedActionParams;
  [SiemMigrationsEventTypes.StartTranslation]: ReportStartTranslationActionParams;
  [SiemMigrationsEventTypes.TranslatedRuleUpdate]: ReportTranslatedRuleUpdateActionParams;
  [SiemMigrationsEventTypes.TranslatedRuleInstall]: ReportTranslatedRuleInstallActionParams;
  [SiemMigrationsEventTypes.TranslatedRuleBulkInstall]: ReportTranslatedRuleBulkInstallActionParams;
}

export interface SiemMigrationsTelemetryEvent {
  eventType: SiemMigrationsEventTypes;
  schema: RootSchema<SiemMigrationsTelemetryEventsMap[SiemMigrationsEventTypes]>;
}
