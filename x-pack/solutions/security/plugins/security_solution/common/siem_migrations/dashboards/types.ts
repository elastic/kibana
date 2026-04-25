/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationGetItemsOptions } from '../../../server/lib/siem_migrations/common/data/types';
import type { SiemMigrationFilters } from '../types';

export type DashboardMigrationFilters = SiemMigrationFilters;

export type DashboardMigrationGetDashboardOptions =
  SiemMigrationGetItemsOptions<DashboardMigrationFilters>;
