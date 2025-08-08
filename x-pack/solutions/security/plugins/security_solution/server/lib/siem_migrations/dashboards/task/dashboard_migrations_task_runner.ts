/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import type {
  ElasticDashboard,
  DashboardMigration,
  DashboardMigrationDashboard,
} from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import type { DashboardMigrationsDataClient } from '../data/dashboard_migrations_data_client';
import type { MigrateDashboardConfigSchema, MigrateDashboardState } from './agent/types';
import { getDashboardMigrationAgent } from './agent';
import { DashboardMigrationsRetriever } from './retrievers';
import type { StoredDashboardMigrationDashboard } from '../types';
import { EsqlKnowledgeBase } from '../../common/task/util/esql_knowledge_base';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import { SiemMigrationTaskRunner } from '../../common/task/siem_migrations_task_runner';
import { DashboardMigrationTelemetryClient } from './dashboard_migrations_telemetry_client';
import type { MigrationResources } from '../../common/task/retrievers/resource_retriever';
import { nullifyMissingProperties } from '../../common/task/util/nullify_missing_properties';

export interface DashboardMigrationTaskInput
  extends Pick<StoredDashboardMigrationDashboard, 'id' | 'original_dashboard'> {
  resources: MigrationResources;
}
export type DashboardMigrationTaskOutput = MigrateDashboardState;

export class DashboardMigrationTaskRunner extends SiemMigrationTaskRunner<
  DashboardMigration,
  DashboardMigrationDashboard,
  DashboardMigrationTaskInput,
  MigrateDashboardConfigSchema,
  DashboardMigrationTaskOutput
> {
  private retriever: DashboardMigrationsRetriever;

  constructor(
    public readonly migrationId: string,
    public readonly startedBy: AuthenticatedUser,
    public readonly abortController: AbortController,
    protected readonly data: DashboardMigrationsDataClient,
    protected readonly logger: Logger,
    protected readonly dependencies: SiemMigrationsClientDependencies
  ) {
    super(migrationId, startedBy, abortController, data, logger, dependencies);
    this.retriever = new DashboardMigrationsRetriever(this.migrationId, {
      data: this.data,
    });
  }

  /** Retrieves the connector and creates the migration agent */
  public async setup(connectorId: string): Promise<void> {
    const { inferenceClient } = this.dependencies;
    const model = await this.actionsClientChat.createModel({
      connectorId,
      migrationId: this.migrationId,
      abortController: this.abortController,
    });

    const telemetryClient = new DashboardMigrationTelemetryClient(
      this.dependencies.telemetry,
      this.logger,
      this.migrationId,
      model.model
    );

    const esqlKnowledgeBase = new EsqlKnowledgeBase(
      connectorId,
      this.migrationId,
      inferenceClient,
      this.logger
    );

    const agent = getDashboardMigrationAgent({
      esqlKnowledgeBase,
      model,
      dashboardMigrationsRetriever: this.retriever,
      logger: this.logger,
      telemetryClient,
    });

    this.telemetry = telemetryClient;
    this.task = (input, config) => agent.invoke(input, config);
  }

  protected async prepareTaskInput(
    migrationDashboard: StoredDashboardMigrationDashboard
  ): Promise<DashboardMigrationTaskInput> {
    const resources = await this.retriever.resources.getResources(migrationDashboard);
    return {
      id: migrationDashboard.id,
      original_dashboard: migrationDashboard.original_dashboard,
      resources,
    };
  }

  protected processTaskOutput(
    migrationDashboard: StoredDashboardMigrationDashboard,
    migrationOutput: DashboardMigrationTaskOutput
  ): StoredDashboardMigrationDashboard {
    return {
      ...migrationDashboard,
      elastic_dashboard: nullifyMissingProperties({
        source: migrationDashboard.elastic_dashboard,
        target: migrationOutput.elastic_dashboard as ElasticDashboard,
      }),
      translation_result: migrationOutput.translation_result,
      // TODO: comments: migrationOutput.comments,
    };
  }
}
