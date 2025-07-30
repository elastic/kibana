/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticatedUser,
  ElasticsearchClient,
  IScopedClusterClient,
  Logger,
} from '@kbn/core/server';
import { type FieldMap, type InstallParams } from '@kbn/index-adapter';
import type {
  DashboardMigrationAdapters,
  DashboardMigrationAdapterId,
  DashboardMigrationIndexNameProviders,
} from '../types';
import { SiemMigrationsBaseDataService } from '../../common/siem_migrations_base_service';
import { dashboardMigrationsDashboardsFieldMap, dashboardMigrationsFieldMap } from './field_maps';
import { DashboardMigrationsDataClient } from './dashboard_migrations_data_client';
import type { SiemMigrationsClientDependencies } from '../../common/types';
export const INDEX_PATTERN = '.kibana-siem-dashboard-migrations';

interface CreateClientParams {
  spaceId: string;
  currentUser: AuthenticatedUser;
  esScopedClient: IScopedClusterClient;
  dependencies: SiemMigrationsClientDependencies;
}
interface CreateDashboardAdapterParams {
  adapterId: DashboardMigrationAdapterId;
  fieldMap: FieldMap;
}

export interface SetupParams extends Omit<InstallParams, 'logger'> {
  esClient: ElasticsearchClient;
}

export class DashboardMigrationsDataService extends SiemMigrationsBaseDataService {
  private readonly adapters: DashboardMigrationAdapters;

  constructor(private logger: Logger, protected kibanaVersion: string, elserInferenceId?: string) {
    super(kibanaVersion);
    this.adapters = {
      migrations: this.createDashboardIndexPatternAdapter({
        adapterId: 'migrations',
        fieldMap: dashboardMigrationsFieldMap,
      }),
      dashboards: this.createDashboardIndexPatternAdapter({
        adapterId: 'dashboards',
        fieldMap: dashboardMigrationsDashboardsFieldMap,
      }),
      // resources: this.createDashboardIndexPatternAdapter({
      //   adapterId: 'resources',
      //   fieldMap: ruleMigrationResourcesFieldMap,
      // }),
      // integrations: this.createDashboardIndexAdapter({
      //   adapterId: 'integrations',
      //   fieldMap: getIntegrationsFieldMap({ elserInferenceId }),
      // }),
      // prebuiltrules: this.createDashboardIndexAdapter({
      //   adapterId: 'prebuiltrules',
      //   fieldMap: getPrebuiltDashboardsFieldMap({ elserInferenceId }),
      // }),
    };
  }

  private getAdapterIndexName(adapterId: DashboardMigrationAdapterId) {
    return `${INDEX_PATTERN}-${adapterId}`;
  }

  private createDashboardIndexPatternAdapter({
    adapterId,
    fieldMap,
  }: CreateDashboardAdapterParams) {
    const name = this.getAdapterIndexName(adapterId);
    return this.createIndexPatternAdapter({ name, fieldMap });
  }

  private createDashboardIndexAdapter({ adapterId, fieldMap }: CreateDashboardAdapterParams) {
    const name = this.getAdapterIndexName(adapterId);
    return this.createIndexAdapter({ name, fieldMap });
  }

  private async install(params: SetupParams): Promise<void> {
    await Promise.all([
      this.adapters.dashboards.install({ ...params, logger: this.logger }),
      this.adapters.migrations.install({ ...params, logger: this.logger }),
    ]);
  }

  public async setup(params: SetupParams): Promise<void> {
    await this.install(params);
  }

  public createClient({ spaceId, currentUser, esScopedClient, dependencies }: CreateClientParams) {
    const indexNameProviders: DashboardMigrationIndexNameProviders = {
      dashboards: this.createIndexNameProvider(this.adapters.dashboards, spaceId),
      migrations: this.createIndexNameProvider(this.adapters.migrations, spaceId),
    };

    return new DashboardMigrationsDataClient(
      indexNameProviders,
      currentUser,
      esScopedClient,
      this.logger,
      spaceId,
      dependencies
    );
  }
}
