/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import type { IClusterClient, LoggerFactory, Logger } from '@kbn/core/server';
import type { Subject } from 'rxjs';
import type { DashboardMigrationsDataClient } from './data/dashboard_migrations_data_client';
import { DashboardMigrationsDataService } from './data/dashboard_migrations_data_service';
import type { SiemMigrationsCommonCreateClientParams } from '../common/types';
import type { DashboardMigrationsClientDependencies } from './types';

export interface DashboardMigrationsCreateClientParams
  extends SiemMigrationsCommonCreateClientParams {
  dependencies: DashboardMigrationsClientDependencies;
}

export interface SiemDashboardsMigrationsSetupParams {
  esClusterClient: IClusterClient;
  pluginStop$: Subject<void>;
  tasksTimeoutMs?: number;
}

export interface SiemDashboardMigrationsClient {
  data: DashboardMigrationsDataClient;
}

export class SiemDashboardMigrationsService {
  private dataService: DashboardMigrationsDataService;
  private esClusterClient?: IClusterClient;
  private logger: Logger;

  constructor(logger: LoggerFactory, kibanaVersion: string, elserInferenceId?: string) {
    this.logger = logger.get('siemDashboardMigrations');
    this.dataService = new DashboardMigrationsDataService(this.logger, kibanaVersion);
  }

  setup({ esClusterClient, ...params }: SiemDashboardsMigrationsSetupParams) {
    this.esClusterClient = esClusterClient;
    const esClient = esClusterClient.asInternalUser;

    this.dataService.setup({ ...params, esClient }).catch((err) => {
      this.logger.error('Error installing data service.', err);
    });
  }

  createClient({
    request,
    currentUser,
    spaceId,
    dependencies,
  }: DashboardMigrationsCreateClientParams): SiemDashboardMigrationsClient {
    assert(currentUser, 'Current user must be authenticated');
    assert(this.esClusterClient, 'ES client not available, please call setup first');

    const esScopedClient = this.esClusterClient.asScoped(request);
    const dataClient = this.dataService.createClient({
      spaceId,
      currentUser,
      esScopedClient,
      dependencies,
    });

    return { data: dataClient };
  }

  stop() {}
}
