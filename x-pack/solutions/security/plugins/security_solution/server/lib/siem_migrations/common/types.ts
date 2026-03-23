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
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ExperimentalFeatures } from '../../../../common';
import type {
  DashboardMigration,
  DashboardMigrationDashboard,
} from '../../../../common/siem_migrations/model/dashboard_migration.gen';
import type {
  RuleMigration,
  RuleMigrationRule,
} from '../../../../common/siem_migrations/model/rule_migration.gen';

export interface SiemMigrationsClientDependencies {
  inferenceService: InferenceServerStart;
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  packageService?: PackageService;
  telemetry: AnalyticsServiceSetup;
  experimentalFeatures: ExperimentalFeatures;
}

export interface SiemMigrationsCreateClientParams {
  request: KibanaRequest;
  currentUser: AuthenticatedUser | null;
  spaceId: string;
  dependencies: SiemMigrationsClientDependencies;
}

export type SiemMigrationsIndexNameProvider = () => Promise<string>;

export type Stored<T extends object> = T & { id: string };

export type MigrationDocument = RuleMigration | DashboardMigration;
export type ItemDocument = RuleMigrationRule | DashboardMigrationDashboard;

export type StoredSiemMigration = Stored<MigrationDocument>;
export type StoredSiemMigrationItem = Stored<ItemDocument>;
