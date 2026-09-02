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
import type { WorkflowMigrationsTaskClient } from './task/workflow_migrations_task_client';
import { WorkflowMigrationsTaskService } from './task/workflow_migrations_task_service';
import type { SiemMigrationsCreateClientParams } from '../common/types';

export interface SiemWorkflowsMigrationsSetupParams {
  esClusterClient: IClusterClient;
  pluginStop$: Subject<void>;
  tasksTimeoutMs?: number;
}

export interface SiemWorkflowMigrationsClient {
  data: WorkflowMigrationsDataClient;
  task: WorkflowMigrationsTaskClient;
}

export class SiemWorkflowMigrationsService {
  private dataService: WorkflowMigrationsDataService;
  private esClusterClient?: IClusterClient;
  private taskService: WorkflowMigrationsTaskService;
  private logger: Logger;

  constructor(logger: LoggerFactory, kibanaVersion: string) {
    this.logger = logger.get('siemWorkflowMigrations');
    this.dataService = new WorkflowMigrationsDataService(this.logger, kibanaVersion);
    this.taskService = new WorkflowMigrationsTaskService(this.logger);
  }

  setup({ esClusterClient, ...params }: SiemWorkflowsMigrationsSetupParams) {
    this.esClusterClient = esClusterClient;
    const esClient = esClusterClient.asInternalUser;

    this.dataService.setup({ ...params, esClient }).catch((err) => {
      this.logger.error('Error installing workflow migrations data service.', err);
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

    const taskClient = this.taskService.createClient({
      request,
      currentUser,
      dataClient,
      dependencies,
    });

    return { data: dataClient, task: taskClient };
  }

  stop() {
    this.taskService.stopAll();
  }
}
