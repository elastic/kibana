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
import type {
  OriginalWorkflow,
  OriginalWorkflowVendor,
  WorkflowMigration,
  WorkflowMigrationWorkflow,
} from './workflows/types';

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

export type MigrationDocument = RuleMigration | DashboardMigration | WorkflowMigration;
export type ItemDocument =
  | RuleMigrationRule
  | DashboardMigrationDashboard
  | WorkflowMigrationWorkflow;

/**
 * Resolves the "original" nested document for a migration item.
 * Keep the dashboard fallback last — dashboards pass `OriginalDashboard` as the
 * ResourceIdentifier type param (not the full item document).
 */
export type OriginalItem<I> = I extends RuleMigrationRule
  ? RuleMigrationRule['original_rule']
  : I extends WorkflowMigrationWorkflow | OriginalWorkflow
  ? OriginalWorkflow
  : DashboardMigrationDashboard['original_dashboard'];

export type MigrationType = 'rule' | 'dashboard' | 'workflow';

export type { OriginalWorkflowVendor };
