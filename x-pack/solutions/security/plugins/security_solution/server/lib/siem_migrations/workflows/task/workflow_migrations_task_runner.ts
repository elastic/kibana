/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import type {
  WorkflowMigration,
  WorkflowMigrationWorkflow,
} from '../../../../../common/siem_migrations/workflows/types';
import type { WorkflowMigrationsDataClient } from '../data/workflow_migrations_data_client';
import type { MigrateWorkflowConfigSchema } from './agent/types';
import {
  getWorkflowMigrationAgent,
  type WorkflowMigrationTaskInput,
  type WorkflowMigrationTaskOutput,
} from './agent';
import type { StoredWorkflowMigrationWorkflow } from '../types';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import { SiemMigrationTaskRunner } from '../../common/task/siem_migrations_task_runner';
import { WorkflowMigrationTelemetryClient } from './workflow_migrations_telemetry_client';
import type { SiemMigrationVendor } from '../../../../../common/siem_migrations/model/common.gen';

export class WorkflowMigrationTaskRunner extends SiemMigrationTaskRunner<
  WorkflowMigration,
  WorkflowMigrationWorkflow,
  WorkflowMigrationTaskInput,
  MigrateWorkflowConfigSchema,
  WorkflowMigrationTaskOutput
> {
  protected readonly taskConcurrency = 3;

  constructor(
    public readonly migrationId: string,
    protected readonly vendor: SiemMigrationVendor,
    protected readonly request: KibanaRequest,
    public readonly startedBy: AuthenticatedUser,
    public readonly abortController: AbortController,
    protected readonly data: WorkflowMigrationsDataClient,
    protected readonly logger: Logger,
    protected readonly dependencies: SiemMigrationsClientDependencies
  ) {
    super(migrationId, vendor, request, startedBy, abortController, data, logger, dependencies);
  }

  public async setup(connectorId: string): Promise<void> {
    const model = await this.actionsClientChat.createModel({
      connectorId,
      migrationType: 'workflows',
      migrationId: this.migrationId,
      abortController: this.abortController,
    });
    const modelName = this.actionsClientChat.getModelName(model);

    const telemetryClient = new WorkflowMigrationTelemetryClient(
      this.dependencies.telemetry,
      this.logger,
      this.migrationId,
      modelName,
      this.vendor
    );

    const agent = getWorkflowMigrationAgent({
      model,
      logger: this.logger,
    });

    this.telemetry = telemetryClient;
    this.task = (input, config) => agent.invoke(input, config);
  }

  protected async prepareTaskInput(
    migrationWorkflow: StoredWorkflowMigrationWorkflow
  ): Promise<WorkflowMigrationTaskInput> {
    return {
      id: migrationWorkflow.id,
      original_workflow: migrationWorkflow.original_workflow,
    };
  }

  protected processTaskOutput(
    migrationWorkflow: StoredWorkflowMigrationWorkflow,
    migrationOutput: WorkflowMigrationTaskOutput
  ): StoredWorkflowMigrationWorkflow {
    return {
      ...migrationWorkflow,
      elastic_workflow: migrationOutput.elastic_workflow,
      translation_result: migrationOutput.translation_result,
      comments: migrationOutput.comments,
    };
  }
}
