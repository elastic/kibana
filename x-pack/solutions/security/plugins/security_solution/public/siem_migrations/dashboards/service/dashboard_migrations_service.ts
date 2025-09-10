/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { DashboardMigrationTaskStats } from '../../../../common/siem_migrations/model/dashboard_migration.gen';
import type {
  CreateDashboardMigrationDashboardsRequestBody,
  StartDashboardsMigrationResponse,
  StopDashboardsMigrationResponse,
  UpsertDashboardMigrationResourcesRequestBody,
} from '../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import type { TelemetryServiceStart } from '../../../common/lib/telemetry';
import type { StartPluginsDependencies } from '../../../types';
import { ExperimentalFeaturesService } from '../../../common/experimental_features_service';
import { licenseService } from '../../../common/hooks/use_license';
import * as i18n from './translations';
import * as api from '../api';
import { getMissingCapabilitiesToast } from '../../common/service/notifications/missing_capabilities_notification';
import { getNoConnectorToast } from '../../common/service/notifications/no_connector_notification';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import { getSuccessToast } from './notification/success_notification';
import type { CapabilitiesLevel, MissingCapability } from '../../common/service/capabilities';
import { getMissingCapabilitiesChecker } from '../../common/service/capabilities';
import { requiredDashboardMigrationCapabilities } from './capabilities';
import { SiemMigrationsServiceBase } from '../../common/service';
import type { GetMigrationsStatsAllParams, GetMigrationStatsParams } from '../../common/types';
import { START_STOP_POLLING_SLEEP_SECONDS } from '../../common/constants';

export const CREATE_MIGRATION_BODY_BATCH_SIZE = 50;

export class SiemDashboardMigrationsService extends SiemMigrationsServiceBase<DashboardMigrationTaskStats> {
  constructor(
    core: CoreStart,
    plugins: StartPluginsDependencies,
    _telemetryService: TelemetryServiceStart
  ) {
    super(core, plugins);
  }

  /** Accessor for the dashboard migrations API client */
  public get api() {
    return api;
  }

  /** Returns any missing capabilities for the user to use this feature */
  public getMissingCapabilities(level?: CapabilitiesLevel): MissingCapability[] {
    const getMissingCapabilities = getMissingCapabilitiesChecker(
      requiredDashboardMigrationCapabilities
    );
    return getMissingCapabilities(this.core.application.capabilities, level);
  }

  /** Checks if the service is available based on the `license`, `capabilities` and `experimentalFeatures` */
  public isAvailable() {
    const { automaticDashboardsMigration, siemMigrationsDisabled } =
      ExperimentalFeaturesService.get();
    return (
      automaticDashboardsMigration &&
      !siemMigrationsDisabled &&
      licenseService.isEnterprise() &&
      !this.hasMissingCapabilities('all')
    );
  }

  /** Adds dashboards to a dashboard migration, batching the requests to avoid hitting the max payload size limit of the API */
  public async addDashboardsToMigration(
    migrationId: string,
    dashboards: CreateDashboardMigrationDashboardsRequestBody
  ) {
    const dashboardsCount = dashboards.length;
    if (dashboardsCount === 0) {
      throw new Error(i18n.EMPTY_DASHBOARDS_ERROR);
    }

    // Batching creation to avoid hitting the max payload size limit of the API
    for (let i = 0; i < dashboardsCount; i += CREATE_MIGRATION_BODY_BATCH_SIZE) {
      const dashboardsBatch = dashboards.slice(i, i + CREATE_MIGRATION_BODY_BATCH_SIZE);
      await api.addDashboardsToDashboardMigration({ migrationId, body: dashboardsBatch });
    }
  }

  /** Creates a dashboard migration with a name and adds the dashboards to it, returning the migration ID */
  public async createDashboardMigration(
    data: CreateDashboardMigrationDashboardsRequestBody,
    migrationName: string
  ): Promise<string> {
    const dashboardsCount = data.length;
    if (dashboardsCount === 0) {
      throw new Error(i18n.EMPTY_DASHBOARDS_ERROR);
    }

    // create the migration
    const { migration_id: migrationId } = await api.createDashboardMigration({
      name: migrationName,
    });

    await this.addDashboardsToMigration(migrationId, data);

    return migrationId;
  }

  /** Upserts resources for a dashboard migration, batching the requests to avoid hitting the max payload size limit of the API */
  public async upsertMigrationResources(
    migrationId: string,
    body: UpsertDashboardMigrationResourcesRequestBody
  ): Promise<void> {
    const count = body.length;
    if (count === 0) {
      throw new Error(i18n.EMPTY_DASHBOARDS_ERROR);
    }
    // Batching creation to avoid hitting the max payload size limit of the API
    for (let i = 0; i < count; i += CREATE_MIGRATION_BODY_BATCH_SIZE) {
      const bodyBatch = body.slice(i, i + CREATE_MIGRATION_BODY_BATCH_SIZE);
      await api.upsertDashboardMigrationResources({ migrationId, body: bodyBatch });
    }
  }

  /** Starts a dashbaord migration task and waits for the task to start running */
  public async startDashboardMigration(
    migrationId: string,
    retry?: api.StartDashboardsMigrationParams['retry'],
    settings?: api.StartDashboardsMigrationParams['settings']
  ): Promise<StartDashboardsMigrationResponse> {
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
    const params: api.StartDashboardsMigrationParams = {
      migrationId,
      settings: { connectorId },
      retry,
    };

    const traceOptions = this.traceOptionsStorage.get();
    if (traceOptions) {
      params.langSmithOptions = {
        project_name: traceOptions.langSmithProject,
        api_key: traceOptions.langSmithApiKey,
      };
    }

    const result = await api.startDashboardMigration(params);

    // Should take a few seconds to stop the task, so we poll until it is not running anymore
    await this.migrationTaskPollingUntil(
      migrationId,
      ({ status }) => status !== SiemMigrationTaskStatus.RUNNING, // may be STOPPED, FINISHED or INTERRUPTED
      { sleepSecs: START_STOP_POLLING_SLEEP_SECONDS, timeoutSecs: 90 } // wait up to 90 seconds for the task to stop
    );

    this.startPolling();

    return result;
  }

  /** Stops a running dashboard migration task and waits for the task to completely stop */
  public async stopDashboardMigration(
    migrationId: string
  ): Promise<StopDashboardsMigrationResponse> {
    const missingCapabilities = this.getMissingCapabilities('all');
    if (missingCapabilities.length > 0) {
      this.core.notifications.toasts.add(
        getMissingCapabilitiesToast(missingCapabilities, this.core)
      );
      return { stopped: false };
    }

    const result = await api.stopDashboardMigration({ migrationId });

    // Should take a few seconds to stop the task, so we poll until it is not running anymore
    await this.migrationTaskPollingUntil(
      migrationId,
      ({ status }) => status !== SiemMigrationTaskStatus.RUNNING, // may be STOPPED, FINISHED or INTERRUPTED
      { sleepSecs: START_STOP_POLLING_SLEEP_SECONDS, timeoutSecs: 90 } // wait up to 90 seconds for the task to stop
    );

    return result;
  }

  protected async startMigrationFromStats(
    connectorId: string,
    taskStats: DashboardMigrationTaskStats
  ): Promise<void> {
    await api.startDashboardMigration({
      migrationId: taskStats.id,
      settings: { connectorId },
    });
  }

  protected async fetchMigrationStats({
    migrationId,
  }: GetMigrationStatsParams): Promise<DashboardMigrationTaskStats> {
    const stats = await api.getDashboardMigrationStats({ migrationId });
    return stats;
  }
  protected async fetchMigrationsStatsAll(
    params: GetMigrationsStatsAllParams = {}
  ): Promise<DashboardMigrationTaskStats[]> {
    const allStats = await api.getDashboardMigrationAllStats(params);
    return allStats;
  }

  protected sendFinishedMigrationNotification(taskStats: DashboardMigrationTaskStats) {
    this.core.notifications.toasts.addSuccess(getSuccessToast(taskStats, this.core));
  }
}
