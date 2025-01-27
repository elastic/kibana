/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';

export const SIEM_MIGRATIONS_ASSISTANT_USER = 'assistant';

export const SIEM_MIGRATIONS_PATH = '/internal/siem_migrations' as const;
export const SIEM_RULE_MIGRATIONS_PATH = `${SIEM_MIGRATIONS_PATH}/rules` as const;

export const SIEM_RULE_MIGRATIONS_ALL_STATS_PATH = `${SIEM_RULE_MIGRATIONS_PATH}/stats` as const;
export const SIEM_RULE_MIGRATIONS_INTEGRATIONS_PATH =
  `${SIEM_RULE_MIGRATIONS_PATH}/integrations` as const;
export const SIEM_RULE_MIGRATION_CREATE_PATH =
  `${SIEM_RULE_MIGRATIONS_PATH}/{migration_id?}` as const;
export const SIEM_RULE_MIGRATION_PATH = `${SIEM_RULE_MIGRATIONS_PATH}/{migration_id}` as const;
export const SIEM_RULE_MIGRATION_START_PATH = `${SIEM_RULE_MIGRATION_PATH}/start` as const;
export const SIEM_RULE_MIGRATION_STATS_PATH = `${SIEM_RULE_MIGRATION_PATH}/stats` as const;
export const SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH =
  `${SIEM_RULE_MIGRATION_PATH}/translation_stats` as const;
export const SIEM_RULE_MIGRATION_STOP_PATH = `${SIEM_RULE_MIGRATION_PATH}/stop` as const;
export const SIEM_RULE_MIGRATION_INSTALL_PATH = `${SIEM_RULE_MIGRATION_PATH}/install` as const;
export const SIEM_RULE_MIGRATIONS_PREBUILT_RULES_PATH =
  `${SIEM_RULE_MIGRATION_PATH}/prebuilt_rules` as const;

export const SIEM_RULE_MIGRATION_RESOURCES_PATH = `${SIEM_RULE_MIGRATION_PATH}/resources` as const;
export const SIEM_RULE_MIGRATION_RESOURCES_MISSING_PATH =
  `${SIEM_RULE_MIGRATION_RESOURCES_PATH}/missing` as const;

export const SIEM_RULE_MIGRATION_MISSING_PRIVILEGES_PATH =
  `${SIEM_RULE_MIGRATIONS_PATH}/missing_privileges` as const;

export const LOOKUPS_INDEX_PREFIX = 'lookup_';

export enum SiemMigrationTaskStatus {
  READY = 'ready',
  RUNNING = 'running',
  STOPPED = 'stopped',
  FINISHED = 'finished',
}

export enum SiemMigrationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum SiemMigrationRetryFilter {
  FAILED = 'failed',
  NOT_FULLY_TRANSLATED = 'not_fully_translated',
}

export enum RuleTranslationResult {
  FULL = 'full',
  PARTIAL = 'partial',
  UNTRANSLATABLE = 'untranslatable',
}

export const DEFAULT_TRANSLATION_RISK_SCORE = 21;
export const DEFAULT_TRANSLATION_SEVERITY: Severity = 'low';

export const DEFAULT_TRANSLATION_FIELDS = {
  from: 'now-360s',
  to: 'now',
  interval: '5m',
} as const;
