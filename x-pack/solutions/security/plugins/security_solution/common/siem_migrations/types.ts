/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DashboardMigration,
  DashboardMigrationDashboard,
  OriginalDashboardVendor,
} from './model/dashboard_migration.gen';
import type {
  OriginalRuleVendor,
  RuleMigration,
  RuleMigrationRule,
} from './model/rule_migration.gen';
import type { SiemMigrationStatus } from './constants';

export interface SiemMigrationFilters {
  status?: SiemMigrationStatus | SiemMigrationStatus[];
  ids?: string[];
  failed?: boolean;
  fullyTranslated?: boolean;
  partiallyTranslated?: boolean;
  untranslatable?: boolean;
  searchTerm?: string;
  installed?: boolean;
  installable?: boolean;
  isEligibleForTranslation?: boolean;
}

export type SiemMigrationVendor = OriginalRuleVendor | OriginalDashboardVendor;

export type MigrationDocument = RuleMigration | DashboardMigration;
export type ItemDocument = RuleMigrationRule | DashboardMigrationDashboard;
export type OriginalItem<I> = I extends RuleMigrationRule
  ? RuleMigrationRule['original_rule']
  : DashboardMigrationDashboard['original_dashboard'];

export type MigrationType = 'rule' | 'dashboard';
