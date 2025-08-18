/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardMigrationDashboard } from '../model/dashboard_migration.gen';

export type CreateDashboardsInput = Omit<
  DashboardMigrationDashboard,
  '@timestamp' | 'id' | 'status' | 'created_by' | 'updated_by' | 'updated_at'
>;
