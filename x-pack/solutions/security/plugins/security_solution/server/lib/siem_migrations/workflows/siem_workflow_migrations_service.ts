/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import type { IClusterClient, LoggerFactory, Logger } from '@kbn/core/server';
import type { Subject } from 'rxjs';
import type { WorkflowMigrationsDataClient } from './data/workflow_migrations_data_client';
import { WorkflowMigrationsDataService } from './data/workflow_migrations_data_service';
import type { SiemMigrationsCreateClientParams } from '../common/types';

export interface SiemWorkflowMigrationsSetupParams {
  esClusterClient: IClusterClient;
  pluginStop$: Subject<void>;
  tasksTimeoutMs?: number;
}

export interface SiemWorkflowMigrationsClient {
  data: WorkflowMigrationsDataClient;
}

export class SiemWorkflowMigrationsService {
  private dataService: WorkflowMigrationsDataService;
  private esClusterClient?: IClusterClient;
  private logger: Logger;

  constructor(logger: LoggerFactory, kibanaVersion: string, _elserInferenceId?: string) {
    this.logger = logger.get('siemWorkflowMigrations');
    this.dataService = new WorkflowMigrationsDataService(this.logger, kibanaVersion);
  }

  setup({ esClusterClient, ...params }: SiemWorkflowMigrationsSetupParams) {
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
  }: SiemMigrationsCreateClientParams): SiemWorkflowMigrationsClient {
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

  stop(): void {
    this.logger.debug('Workflow migrations service stopped');
  }
}
