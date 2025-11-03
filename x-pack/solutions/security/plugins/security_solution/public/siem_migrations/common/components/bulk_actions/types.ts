/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardMigrationDashboard } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';

export type BulkActionsItem = RuleMigrationRule | DashboardMigrationDashboard;
