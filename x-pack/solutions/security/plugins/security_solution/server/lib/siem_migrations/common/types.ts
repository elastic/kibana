/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { AnalyticsServiceSetup } from '@kbn/core/public';
import type {
  AuthenticatedUser,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { PackageService } from '@kbn/fleet-plugin/server';
import type { InferenceClient } from '@kbn/inference-common';
import type {
  DashboardMigration,
  DashboardMigrationDashboard,
} from '../../../../common/siem_migrations/model/dashboard_migration.gen';
import type {
  RuleMigration,
  RuleMigrationRule,
} from '../../../../common/siem_migrations/model/rule_migration.gen';

export interface SiemMigrationsClientDependencies {
  inferenceClient: InferenceClient;
  actionsClient: ActionsClient;
  savedObjectsClient: SavedObjectsClientContract;
  packageService?: PackageService;
  telemetry: AnalyticsServiceSetup;
}

export interface SiemMigrationsCommonCreateClientParams {
  request: KibanaRequest;
  currentUser: AuthenticatedUser | null;
  spaceId: string;
  dependencies: SiemMigrationsClientDependencies;
}

export type SiemMigrationsIndexNameProvider = () => Promise<string>;

export type Stored<T extends object> = T & { id: string };

// TODO: replace these with the schemas for the common properties of the migrations and items
// TODO: move these to the security_solution/common/siem_migrations/types.ts
export type MigrationDocument = RuleMigration | DashboardMigration;
export type ItemDocument = RuleMigrationRule | DashboardMigrationDashboard;

export type StoredSiemMigration = Stored<MigrationDocument>;
export type StoredSiemMigrationItem = Stored<ItemDocument>;
