/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';
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
import {
  CREATE_MIGRATION_BODY_BATCH_SIZE,
  START_STOP_POLLING_SLEEP_SECONDS,
  TASK_STATS_POLLING_SLEEP_SECONDS,
} from '../../common/constants';
import * as i18n from './translations';
import * as api from '../api';
import { getMissingCapabilitiesToast } from '../../common/service/notifications/missing_capabilities_notification';
import { getNoConnectorToast } from '../../common/service/notifications/no_connector_notification';
import { SiemMigrationsItemService } from '../../common/service/siem_migrations_item_service';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import { getSuccessToast } from './notification/success_notification';
import type { CapabilitiesLevel, MissingCapability } from '../../common/service/capabilities';
import { getMissingCapabilitiesChecker } from '../../common/service/capabilities';
import { requiredDashboardMigrationCapabilities } from './capabilities';

export class SiemDashboardMigrationsService extends SiemMigrationsItemService {
  private readonly latestStats$: BehaviorSubject<DashboardMigrationTaskStats[] | null>;

  protected isPolling = false;

  constructor(
    core: CoreStart,
    plugins: StartPluginsDependencies,
    _telemetryService: TelemetryServiceStart
  ) {
    super(core, plugins);

    this.latestStats$ = new BehaviorSubject<DashboardMigrationTaskStats[] | null>(null);

    this.plugins.spaces.getActiveSpace().then((space) => {
      this.connectorIdStorage.setSpaceId(space.id);
    });
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

  /** Checks if the user has any missing capabilities for this feature */
  public hasMissingCapabilities(level?: CapabilitiesLevel): boolean {
    return this.getMissingCapabilities(level).length > 0;
  }

  /** Checks if the service is available based on the `license`, `capabilities` and `experimentalFeatures` */
  public isAvailable() {
    return (
      !ExperimentalFeaturesService.get().siemMigrationsDisabled &&
      ExperimentalFeaturesService.get().automaticDashboardsMigration &&
      licenseService.isEnterprise() &&
      !this.hasMissingCapabilities('all')
    );
  }

  /** Retries the API call to get rule migrations stats in case of network errors or 503 status */
  private async getDashboardMigrationAllStatsWithRetry(
    params: api.GetDashboardMigrationAllStatsParams = {},
    sleepSecs?: number
  ): Promise<DashboardMigrationTaskStats[]> {
    if (sleepSecs) {
      await this.sleep(sleepSecs);
    }

    return api.getDashboardMigrationAllStats(params).catch((e) => {
      // Retry only on network errors (no status) and 503 (Service Unavailable), otherwise throw
      const status = e.response?.status || e.status;
      if (status && status !== 503) {
        throw e;
      }
      const nextSleepSecs = sleepSecs ? sleepSecs * 2 : 1; // Exponential backoff
      if (nextSleepSecs > 60) {
        // Wait for a minutes max (two minutes total) for the API to be available again
        throw e;
      }
      return this.getDashboardMigrationAllStatsWithRetry(params, nextSleepSecs);
    });
  }

  public async getDashboardMigrationAllStats(params: api.GetDashboardMigrationAllStatsParams = {}) {
    const allStats = await api.getDashboardMigrationAllStats(params);
    this.latestStats$.next(allStats);
    return allStats;
  }

  protected async updateLatestStats(): Promise<void> {
    await this.getDashboardMigrationAllStats();
  }

  /** Starts polling the rule migrations stats and handles the notifications for finished migrations */
  protected async startTaskStatsPolling(): Promise<void> {
    let pendingMigrationIds: string[] = [];
    do {
      const results = await this.getDashboardMigrationAllStats();

      if (pendingMigrationIds.length > 0) {
        // send notifications for finished migrations
        pendingMigrationIds.forEach((pendingMigrationId) => {
          const migrationStats = results.find((item) => item.id === pendingMigrationId);
          if (migrationStats?.status === SiemMigrationTaskStatus.FINISHED) {
            this.core.notifications.toasts.addSuccess(getSuccessToast(migrationStats, this.core));
          }
        });
      }

      // reprocess pending migrations
      pendingMigrationIds = [];
      for (const result of results) {
        if (result.status === SiemMigrationTaskStatus.RUNNING) {
          pendingMigrationIds.push(result.id);
        }

        // automatically resume interrupted migrations when the proper conditions are met
        if (
          result.status === SiemMigrationTaskStatus.INTERRUPTED &&
          !result.last_execution?.error
        ) {
          const connectorId = result.last_execution?.connector_id ?? this.connectorIdStorage.get();
          if (connectorId && !this.hasMissingCapabilities('all')) {
            await api.startDashboardMigration({
              migrationId: result.id,
              settings: { connectorId },
            });
            pendingMigrationIds.push(result.id);
          }
        }
      }

      // Do not wait if there are no more pending migrations
      if (pendingMigrationIds.length > 0) {
        await this.sleep(TASK_STATS_POLLING_SLEEP_SECONDS);
      }
    } while (pendingMigrationIds.length > 0);
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

  /** Creates a rule migration with a name and adds the rules to it, returning the migration ID */
  public async createDashboardMigration(
    data: CreateDashboardMigrationDashboardsRequestBody,
    migrationName: string
  ): Promise<string> {
    const rulesCount = data.length;
    if (rulesCount === 0) {
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
  public async startRuleMigration(
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

    // Should take a few seconds to start the migration task, so we poll until it is running
    await this.pollTaskUntil(
      () => api.getDashboardMigrationStats({ migrationId }),
      ({ status }) => status === SiemMigrationTaskStatus.RUNNING,
      { sleepSecs: START_STOP_POLLING_SLEEP_SECONDS, timeoutSecs: 90 } // wait up to 90 seconds for the task to start
    );

    this.startPolling();

    return result;
  }

  /** Stops a running rule migration task and waits for the task to completely stop */
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
    await this.pollTaskUntil(
      () => api.getDashboardMigrationStats({ migrationId }),
      ({ status }) => status !== SiemMigrationTaskStatus.RUNNING, // may be STOPPED, FINISHED or INTERRUPTED
      { sleepSecs: START_STOP_POLLING_SLEEP_SECONDS, timeoutSecs: 90 } // wait up to 90 seconds for the task to stop
    );

    return result;
  }
}
