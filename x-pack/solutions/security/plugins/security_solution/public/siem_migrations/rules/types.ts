/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationTaskStatus } from '../../../common/siem_migrations/constants';
import type { RuleMigrationTaskStats } from '../../../common/siem_migrations/model/rule_migration.gen';

export interface RuleMigrationStats extends RuleMigrationTaskStats {
  status: SiemMigrationTaskStatus; // use the native enum instead of the zod enum from the model
}

export enum AuthorFilter {
  ELASTIC = 'elastic',
  CUSTOM = 'custom',
}

export enum StatusFilter {
  INSTALLED = 'installed',
  TRANSLATED = 'translated',
  PARTIALLY_TRANSLATED = 'partially_translated',
  UNTRANSLATABLE = 'untranslatable',
  FAILED = 'failed',
}

export interface FilterOptions {
  status?: StatusFilter;
  author?: AuthorFilter;
}

export interface RuleMigrationSettings {
  connectorId: string;
  skipPrebuiltRulesMatching: boolean;
}
