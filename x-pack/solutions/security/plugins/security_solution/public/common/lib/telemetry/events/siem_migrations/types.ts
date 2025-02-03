/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

export enum SiemMigrationsEventTypes {
  TranslatedRuleUpdate = 'Translated Rule Update',
  TranslatedRuleInstall = 'Translated Rule Install',
  TranslatedRuleBulkInstall = 'Translated Rule Bulk Install',
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
