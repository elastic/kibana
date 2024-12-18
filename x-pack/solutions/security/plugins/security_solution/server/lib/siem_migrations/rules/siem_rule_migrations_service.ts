/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import type { Subject } from 'rxjs';
import type {
  AuthenticatedUser,
  LoggerFactory,
  IClusterClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import { RuleMigrationsDataService } from './data/rule_migrations_data_service';
import type { RuleMigrationsDataClient } from './data/rule_migrations_data_client';
import type { RuleMigrationsTaskClient } from './task/rule_migrations_task_client';
import { RuleMigrationsTaskService } from './task/rule_migrations_task_service';

export interface SiemRulesMigrationsSetupParams {
  esClusterClient: IClusterClient;
  pluginStop$: Subject<void>;
  tasksTimeoutMs?: number;
}

export interface SiemRuleMigrationsCreateClientParams {
  request: KibanaRequest;
  currentUser: AuthenticatedUser | null;
  spaceId: string;
}

export interface SiemRuleMigrationsClient {
  data: RuleMigrationsDataClient;
  task: RuleMigrationsTaskClient;
}

export class SiemRuleMigrationsService {
  private dataService: RuleMigrationsDataService;
  private esClusterClient?: IClusterClient;
  private taskService: RuleMigrationsTaskService;
  private logger: Logger;

  constructor(logger: LoggerFactory, kibanaVersion: string) {
    this.logger = logger.get('siemRuleMigrations');
    this.dataService = new RuleMigrationsDataService(this.logger, kibanaVersion);
    this.taskService = new RuleMigrationsTaskService(this.logger);
  }

  setup({ esClusterClient, ...params }: SiemRulesMigrationsSetupParams) {
    this.esClusterClient = esClusterClient;
    const esClient = esClusterClient.asInternalUser;

    this.dataService.install({ ...params, esClient }).catch((err) => {
      this.logger.error('Error installing data service.', err);
    });
  }

  createClient({
    spaceId,
    currentUser,
    request,
  }: SiemRuleMigrationsCreateClientParams): SiemRuleMigrationsClient {
    assert(currentUser, 'Current user must be authenticated');
    assert(this.esClusterClient, 'ES client not available, please call setup first');

    const esClient = this.esClusterClient.asInternalUser;
    const dataClient = this.dataService.createClient({ spaceId, currentUser, esClient });
    const taskClient = this.taskService.createClient({ currentUser, dataClient });

    return { data: dataClient, task: taskClient };
  }

  stop() {
    this.taskService.stopAll();
  }
}
