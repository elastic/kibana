/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import type { DashboardMigrationTaskStats } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import type { RuleMigrationTaskStats } from '../../../../../common/siem_migrations/model/rule_migration.gen';

export type SiemMigrationTaskStats = RuleMigrationTaskStats | DashboardMigrationTaskStats;
export type SiemMigrationDataStats = Omit<SiemMigrationTaskStats, 'name' | 'status'>;
export type SiemMigrationAllDataStats = SiemMigrationDataStats[];

export interface SiemMigrationFilters {
  status?: SiemMigrationStatus | SiemMigrationStatus[];
  ids?: string[];
  installed?: boolean;
  installable?: boolean;
  failed?: boolean;
  fullyTranslated?: boolean;
  partiallyTranslated?: boolean;
  untranslatable?: boolean;
  searchTerm?: string;
  isEligibleForTranslation?: boolean;
}

export interface SiemMigrationSort {
  sortField?: string;
  sortDirection?: estypes.SortOrder;
}

export interface SiemMigrationGetItemsOptions<F extends object = object> {
  filters?: F;
  sort?: SiemMigrationSort;
  from?: number;
  size?: number;
}
