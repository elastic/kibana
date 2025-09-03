/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GetMigrationsStatsAllParams {
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

export interface GetMigrationStatsParams {
  /** `id` of the migration to get stats for */
  migrationId: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

export enum StatusFilter {
  INSTALLED = 'installed',
  TRANSLATED = 'translated',
  PARTIALLY_TRANSLATED = 'partially_translated',
  UNTRANSLATABLE = 'untranslatable',
  FAILED = 'failed',
  INDEX_PATTERN_MISSING = 'index_pattern_missing',
}

export interface FilterOptionsBase {
  status?: StatusFilter;
}

export interface MigrationSettingsBase {
  connectorId: string;
}
