/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type {
  CreateWorkflowMigrationWorkflowsRequestBody,
  StartWorkflowMigrationResponse,
  StopWorkflowMigrationResponse,
} from '../../../../common/siem_migrations/workflows/types';
import type { TelemetryServiceStart } from '../../../common/lib/telemetry';
import type { StartPluginsDependencies } from '../../../types';
import { ExperimentalFeaturesService } from '../../../common/experimental_features_service';
import { licenseService } from '../../../common/hooks/use_license';
import * as i18n from './translations';
import * as api from '../api';
import { getMissingCapabilitiesToast } from '../../common/service/notifications/missing_capabilities_notification';
import { getNoConnectorToast } from '../../common/service/notifications/no_connector_notification';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import { raiseSuccessToast } from './notification/success_notification';
import type { CapabilitiesLevel, MissingCapability } from '../../common/service/capabilities';
import { getMissingCapabilitiesChecker } from '../../common/service/capabilities';
import { requiredWorkflowMigrationCapabilities } from './capabilities';
import { SiemMigrationsServiceBase } from '../../common/service';
import type { GetMigrationsStatsAllParams, GetMigrationStatsParams } from '../../common/types';
import { START_STOP_POLLING_SLEEP_SECONDS } from '../../common/constants';
import type { WorkflowMigrationStats } from '../types';

export const CREATE_MIGRATION_BODY_BATCH_SIZE = 50;

export class SiemWorkflowMigrationsService extends SiemMigrationsServiceBase<WorkflowMigrationStats> {
  constructor(
    core: CoreStart,
    plugins: StartPluginsDependencies,
    _telemetryService: TelemetryServiceStart
  ) {
    super(core, plugins);
  }

  /** Accessor for the workflow migrations API client */
  public get api() {
    return api;
  }

  /** Returns any missing capabilities for the user to use this feature */
  public getMissingCapabilities(level?: CapabilitiesLevel): MissingCapability[] {
    const getMissingCapabilities = getMissingCapabilitiesChecker(
      requiredWorkflowMigrationCapabilities
    );
    return getMissingCapabilities(this.core.application.capabilities, level);
  }

  /** Checks if the service is available based on the `license`, `capabilities` and `experimentalFeatures` */
  public isAvailable() {
    const { tinesWorkflowsMigration, siemMigrationsDisabled } = ExperimentalFeaturesService.get();
    return (
      tinesWorkflowsMigration &&
      !siemMigrationsDisabled &&
      licenseService.isEnterprise() &&
      !this.hasMissingCapabilities('minimum')
    );
  }

  /** Adds workflows to a migration, batching the requests to avoid hitting the max payload size limit */
  public async addWorkflowsToMigration(
    migrationId: string,
    workflows: CreateWorkflowMigrationWorkflowsRequestBody
  ) {
    const workflowsCount = workflows.length;
    if (workflowsCount === 0) {
      throw new Error(i18n.EMPTY_WORKFLOWS_ERROR);
    }

    const batches = [];
    for (let i = 0; i < workflowsCount; i += CREATE_MIGRATION_BODY_BATCH_SIZE) {
      const workflowsBatch = workflows.slice(i, i + CREATE_MIGRATION_BODY_BATCH_SIZE);
      batches.push(api.addWorkflowsToMigration({ migrationId, body: workflowsBatch }));
    }
    const results = await Promise.allSettled(batches);
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );
    if (rejected) {
      throw rejected.reason;
    }
  }

  /** Creates a workflow migration with a name and adds the stories to it, returning the migration ID */
  public async createWorkflowMigration(
    data: CreateWorkflowMigrationWorkflowsRequestBody,
    migrationName: string
  ): Promise<string> {
    const workflowsCount = data.length;
    if (workflowsCount === 0) {
      throw new Error(i18n.EMPTY_WORKFLOWS_ERROR);
    }

    let migrationId: string | undefined;
    try {
      const { migration_id: createdMigrationId } = await api.createWorkflowMigration({
        name: migrationName,
      });
      migrationId = createdMigrationId;

      await this.addWorkflowsToMigration(migrationId, data);

      return migrationId;
    } catch (error) {
      if (migrationId) {
        await api.deleteWorkflowMigration({ migrationId }).catch(() => {});
      }
      throw error;
    }
  }

  /** Starts a workflow migration task and waits for the task to start running */
  public async startWorkflowMigration({
    migrationId,
    settings,
  }: {
    migrationId: string;
    settings?: api.StartWorkflowsMigrationParams['settings'];
  }): Promise<StartWorkflowMigrationResponse> {
    const missingCapabilities = this.getMissingCapabilities('all');
    if (missingCapabilities.length > 0) {
      this.core.notifications.toasts.add(
        getMissingCapabilitiesToast(missingCapabilities, this.core)
      );
      return { started: false };
    }
    const connectorId = settings?.connectorId ?? this.connectorIdStorage.get();
    if (!connectorId) {
      this.core.notifications.toasts.add(getNoConnectorToast(this.core));
      return { started: false };
    }
    const params: api.StartWorkflowsMigrationParams = {
      migrationId,
      settings: { connectorId },
    };

    const traceOptions = this.traceOptionsStorage.get();
    if (traceOptions) {
      params.langSmithOptions = {
        project_name: traceOptions.langSmithProject,
        api_key: traceOptions.langSmithApiKey,
      };
    }

    const result = await api.startWorkflowMigration(params);

    await this.migrationTaskPollingUntil(
      migrationId,
      ({ status }) => status === SiemMigrationTaskStatus.RUNNING,
      { sleepSecs: START_STOP_POLLING_SLEEP_SECONDS, timeoutSecs: 90 }
    );

    this.startPolling();

    return result;
  }

  /** Stops a running workflow migration task and waits for the task to completely stop */
  public async stopWorkflowMigration({
    migrationId,
  }: {
    migrationId: string;
  }): Promise<StopWorkflowMigrationResponse> {
    const missingCapabilities = this.getMissingCapabilities('all');
    if (missingCapabilities.length > 0) {
      this.core.notifications.toasts.add(
        getMissingCapabilitiesToast(missingCapabilities, this.core)
      );
      return { stopped: false };
    }

    const result = await api.stopWorkflowMigration({ migrationId });

    await this.migrationTaskPollingUntil(
      migrationId,
      ({ status }) => status !== SiemMigrationTaskStatus.RUNNING,
      { sleepSecs: START_STOP_POLLING_SLEEP_SECONDS, timeoutSecs: 90 }
    );

    return result;
  }

  protected async startMigrationFromStats({
    connectorId,
    taskStats,
  }: {
    connectorId: string;
    taskStats: WorkflowMigrationStats;
  }): Promise<void> {
    await api.startWorkflowMigration({
      migrationId: taskStats.id,
      settings: { connectorId },
    });
  }

  protected async fetchMigrationStats({
    migrationId,
  }: GetMigrationStatsParams): Promise<WorkflowMigrationStats> {
    return api.getWorkflowMigrationStats({ migrationId });
  }

  protected async fetchMigrationsStatsAll(
    params: GetMigrationsStatsAllParams = {}
  ): Promise<WorkflowMigrationStats[]> {
    return api.getWorkflowMigrationAllStats(params);
  }

  protected sendFinishedMigrationNotification(taskStats: WorkflowMigrationStats) {
    raiseSuccessToast(taskStats, this.core);
  }

  /** Deletes a workflow migration by its ID, refreshing the stats to remove it from the list */
  public async deleteMigration({ migrationId }: { migrationId: string }): Promise<string> {
    await api.deleteWorkflowMigration({ migrationId });
    await this.getMigrationsStats();
    return migrationId;
  }
}
