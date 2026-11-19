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
  WorkflowMigrationAdapters,
  WorkflowMigrationAdapterId,
  WorkflowMigrationIndexNameProviders,
} from '../types';
import { SiemMigrationsBaseDataService } from '../../common/siem_migrations_base_service';
import { workflowMigrationsFieldMap, workflowMigrationsWorkflowsFieldMap } from './field_maps';
import { WorkflowMigrationsDataClient } from './workflow_migrations_data_client';
import type { SiemMigrationsClientDependencies } from '../../common/types';

interface CreateClientParams {
  spaceId: string;
  currentUser: AuthenticatedUser;
  esScopedClient: IScopedClusterClient;
  dependencies: SiemMigrationsClientDependencies;
}

interface CreateWorkflowAdapterParams {
  adapterId: WorkflowMigrationAdapterId;
  fieldMap: FieldMap;
}

export interface SetupParams extends Omit<InstallParams, 'logger'> {
  esClient: ElasticsearchClient;
}

export class WorkflowMigrationsDataService extends SiemMigrationsBaseDataService {
  protected readonly baseIndexName = '.kibana-siem-workflow-migrations';

  private readonly adapters: WorkflowMigrationAdapters;

  constructor(private logger: Logger, protected kibanaVersion: string) {
    super(kibanaVersion);
    this.adapters = {
      migrations: this.createWorkflowIndexPatternAdapter({
        adapterId: 'migrations',
        fieldMap: workflowMigrationsFieldMap,
      }),
      workflows: this.createWorkflowIndexPatternAdapter({
        adapterId: 'workflows',
        fieldMap: workflowMigrationsWorkflowsFieldMap,
      }),
    };
  }

  private createWorkflowIndexPatternAdapter({ adapterId, fieldMap }: CreateWorkflowAdapterParams) {
    const name = this.getAdapterIndexName(adapterId);
    return this.createIndexPatternAdapter({ name, fieldMap });
  }

  public async setup(params: SetupParams): Promise<void> {
    await Promise.all([
      this.adapters.workflows.install({ ...params, logger: this.logger }),
      this.adapters.migrations.install({ ...params, logger: this.logger }),
    ]);
  }

  public createClient({ spaceId, currentUser, esScopedClient, dependencies }: CreateClientParams) {
    const indexNameProviders: WorkflowMigrationIndexNameProviders = {
      workflows: this.createIndexNameProvider(this.adapters.workflows, spaceId),
      migrations: this.createIndexNameProvider(this.adapters.migrations, spaceId),
    };

    return new WorkflowMigrationsDataClient(
      indexNameProviders,
      currentUser,
      esScopedClient,
      this.logger,
      dependencies
    );
  }
}
