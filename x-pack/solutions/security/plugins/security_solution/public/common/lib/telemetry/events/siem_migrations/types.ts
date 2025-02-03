/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

export enum SiemMigrationsEventTypes {
  SetupConnectorSelected = 'SIEM Migrations: Connector selected',
  SetupRulesQueryCopied = 'SIEM Migrations: Rules query copied',
  SetupRulesUploaded = 'SIEM Migrations: Rules uploaded',
  SetupMacrosQueryCopied = 'SIEM Migrations: Macros query copied',
  SetupMacrosUploaded = 'SIEM Migrations: Macros uploaded',
  SetupLookupsQueryCopied = 'SIEM Migrations: Lookups query copied',
  SetupLookupsUploaded = 'SIEM Migrations: Lookups uploaded',
  TranslatedRuleUpdate = 'SIEM Migrations: Translated Rule Update',
  TranslatedRuleInstall = 'SIEM Migrations: Translated Rule Install',
  TranslatedRuleBulkInstall = 'SIEM Migrations: Translated Rule Bulk Install',
}

export interface BaseReportActionParams {
  migrationId: string;
  result: 'success' | 'failed';
  errorMessage?: string;
}

export interface ReportTranslatedRuleUpdateActionParams extends BaseReportActionParams {
  ruleMigrationId: string;
}

export interface ReportTranslatedRuleInstallActionParams extends BaseReportActionParams {
  ruleMigrationId: string;
  author: 'elastic' | 'custom';
  enabled: boolean;
  prebuiltRule?: {
    id: string;
    title: string;
  };
}

export interface ReportTranslatedRuleBulkInstallActionParams extends BaseReportActionParams {
  enabled: boolean;
  count: number;
}

export interface SiemMigrationsTelemetryEventsMap {
  [SiemMigrationsEventTypes.TranslatedRuleUpdate]: ReportTranslatedRuleUpdateActionParams;
  [SiemMigrationsEventTypes.TranslatedRuleInstall]: ReportTranslatedRuleInstallActionParams;
  [SiemMigrationsEventTypes.TranslatedRuleBulkInstall]: ReportTranslatedRuleBulkInstallActionParams;
}

export interface SiemMigrationsTelemetryEvent {
  eventType: SiemMigrationsEventTypes;
  schema: RootSchema<SiemMigrationsTelemetryEventsMap[SiemMigrationsEventTypes]>;
}
