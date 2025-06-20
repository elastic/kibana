/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, distinctUntilChanged, type Observable } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { TraceOptions } from '@kbn/elastic-assistant/impl/assistant/types';
import {
  DEFAULT_ASSISTANT_NAMESPACE,
  TRACE_OPTIONS_SESSION_STORAGE_KEY,
} from '@kbn/elastic-assistant/impl/assistant_context/constants';
import { isEqual } from 'lodash';
import type { TelemetryServiceStart } from '../../../common/lib/telemetry';
import type {
  CreateRuleMigrationRulesRequestBody,
  StartRuleMigrationResponse,
  StopRuleMigrationResponse,
  UpsertRuleMigrationResourcesRequestBody,
} from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SiemMigrationRetryFilter } from '../../../../common/siem_migrations/constants';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import type { StartPluginsDependencies } from '../../../types';
import { ExperimentalFeaturesService } from '../../../common/experimental_features_service';
import { licenseService } from '../../../common/hooks/use_license';
import * as api from '../api';
import {
  getMissingCapabilities,
  type MissingCapability,
  type CapabilitiesLevel,
} from './capabilities';
import type { RuleMigrationSettings, RuleMigrationStats } from '../types';
import { getSuccessToast } from './notifications/success_notification';
import { RuleMigrationsStorage } from './storage';
import * as i18n from './translations';
import { SiemRulesMigrationsTelemetry } from './telemetry';
import { getNoConnectorToast } from './notifications/no_connector_notification';
import { getMissingCapabilitiesToast } from './notifications/missing_capabilities_notification';

// use the default assistant namespace since it's the only one we use
const NAMESPACE_TRACE_OPTIONS_SESSION_STORAGE_KEY =
  `${DEFAULT_ASSISTANT_NAMESPACE}.${TRACE_OPTIONS_SESSION_STORAGE_KEY}` as const;

export const TASK_STATS_POLLING_SLEEP_SECONDS = 10 as const;
export const START_STOP_POLLING_SLEEP_SECONDS = 1 as const;
const CREATE_MIGRATION_BODY_BATCH_SIZE = 50 as const;

export class SiemRulesMigrationsService {
  private readonly latestStats$: BehaviorSubject<RuleMigrationStats[] | null>;
  private isPolling = false;
  public connectorIdStorage = new RuleMigrationsStorage<string>('connectorId');
  public traceOptionsStorage = new RuleMigrationsStorage<TraceOptions>('traceOptions', {
    customKey: NAMESPACE_TRACE_OPTIONS_SESSION_STORAGE_KEY,
    storageType: 'session',
  });
  public telemetry: SiemRulesMigrationsTelemetry;

  constructor(
    private readonly core: CoreStart,
    private readonly plugins: StartPluginsDependencies,
    telemetryService: TelemetryServiceStart
  ) {
    this.telemetry = new SiemRulesMigrationsTelemetry(telemetryService);
    this.latestStats$ = new BehaviorSubject<RuleMigrationStats[] | null>(null);

    this.plugins.spaces.getActiveSpace().then((space) => {
      this.connectorIdStorage.setSpaceId(space.id);
      this.startPolling();
    });
  }

  /** Accessor for the rule migrations API client */
  public get api() {
    return api;
  }

  /** Returns the latest stats observable, which is updated every time the stats are fetched */
  public getLatestStats$(): Observable<RuleMigrationStats[] | null> {
    return this.latestStats$.asObservable().pipe(distinctUntilChanged(isEqual));
  }

  /** Returns any missing capabilities for the user to use this feature */
  public getMissingCapabilities(level?: CapabilitiesLevel): MissingCapability[] {
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
      licenseService.isEnterprise() &&
      !this.hasMissingCapabilities('minimum')
    );
  }

  /** Starts polling the rule migrations stats if not already polling and if the feature is available to the user */
  public startPolling() {
    if (this.isPolling || !this.isAvailable()) {
      return;
    }
    this.isPolling = true;
    this.startTaskStatsPolling()
      .catch((e) => {
        this.core.notifications.toasts.addError(e, { title: i18n.POLLING_ERROR });
      })
      .finally(() => {
        this.isPolling = false;
      });
  }

  /** Adds rules to a rule migration, batching the requests to avoid hitting the max payload size limit of the API */
  public async addRulesToMigration(
    migrationId: string,
    rules: CreateRuleMigrationRulesRequestBody
  ) {
    const rulesCount = rules.length;
    if (rulesCount === 0) {
      throw new Error(i18n.EMPTY_RULES_ERROR);
    }

    // Batching creation to avoid hitting the max payload size limit of the API
    for (let i = 0; i < rulesCount; i += CREATE_MIGRATION_BODY_BATCH_SIZE) {
      const rulesBatch = rules.slice(i, i + CREATE_MIGRATION_BODY_BATCH_SIZE);
      await api.addRulesToMigration({ migrationId, body: rulesBatch });
    }
  }

  /** Creates a rule migration with a name and adds the rules to it, returning the migration ID */
  public async createRuleMigration(
    data: CreateRuleMigrationRulesRequestBody,
    migrationName: string
  ): Promise<string> {
    const rulesCount = data.length;
    if (rulesCount === 0) {
      throw new Error(i18n.EMPTY_RULES_ERROR);
    }

    try {
      // create the migration
      const { migration_id: migrationId } = await api.createRuleMigration({
        name: migrationName,
      });

      await this.addRulesToMigration(migrationId, data);

      this.telemetry.reportSetupMigrationCreated({ migrationId, rulesCount });
      return migrationId;
    } catch (error) {
      this.telemetry.reportSetupMigrationCreated({ rulesCount, error });
      throw error;
    }
  }

  /** Deletes a rule migration by its ID, refreshing the stats to remove it from the list */
  public async deleteMigration(migrationId: string): Promise<string> {
    try {
      await api.deleteMigration({ migrationId });

      // Refresh stats to remove the deleted migration from the list. All UI observables will be updated automatically
      await this.getRuleMigrationsStats();

      this.telemetry.reportSetupMigrationDeleted({ migrationId });
      return migrationId;
    } catch (error) {
      this.telemetry.reportSetupMigrationDeleted({ migrationId, error });
      throw error;
    }
  }

  /** Upserts resources for a rule migration, batching the requests to avoid hitting the max payload size limit of the API */
  public async upsertMigrationResources(
    migrationId: string,
    body: UpsertRuleMigrationResourcesRequestBody
  ): Promise<void> {
    const count = body.length;
    if (count === 0) {
      throw new Error(i18n.EMPTY_RULES_ERROR);
    }
    // We assume all resources are of the same type. There is no use case for mixing types in a single upload
    const type = body[0].type;
    try {
      // Batching creation to avoid hitting the max payload size limit of the API
      for (let i = 0; i < count; i += CREATE_MIGRATION_BODY_BATCH_SIZE) {
        const bodyBatch = body.slice(i, i + CREATE_MIGRATION_BODY_BATCH_SIZE);
        await api.upsertMigrationResources({ migrationId, body: bodyBatch });
      }
      this.telemetry.reportSetupResourceUploaded({ migrationId, type, count });
    } catch (error) {
      this.telemetry.reportSetupResourceUploaded({ migrationId, type, count, error });
      throw error;
    }
  }

  /** Starts a rule migration task and waits for the task to start running */
  public async startRuleMigration(
    migrationId: string,
    retry?: SiemMigrationRetryFilter,
    settings?: RuleMigrationSettings
  ): Promise<StartRuleMigrationResponse> {
    const missingCapabilities = this.getMissingCapabilities('all');
    if (missingCapabilities.length > 0) {
      this.core.notifications.toasts.add(
        getMissingCapabilitiesToast(missingCapabilities, this.core)
      );
      return { started: false };
    }
    const connectorId = settings?.connectorId ?? this.connectorIdStorage.get();
    const skipPrebuiltRulesMatching = settings?.skipPrebuiltRulesMatching;
    if (!connectorId) {
      this.core.notifications.toasts.add(getNoConnectorToast(this.core));
      return { started: false };
    }
    const params: api.StartRuleMigrationParams = {
      migrationId,
      settings: { connectorId, skipPrebuiltRulesMatching },
      retry,
    };

    const traceOptions = this.traceOptionsStorage.get();
    if (traceOptions) {
      params.langSmithOptions = {
        project_name: traceOptions.langSmithProject,
        api_key: traceOptions.langSmithApiKey,
      };
    }

    try {
      const result = await api.startRuleMigration(params);

      // Should take a few seconds to start the task, so we poll until it is running
      await this.migrationTaskPollingUntil(
        migrationId,
        ({ status }) => status === SiemMigrationTaskStatus.RUNNING,
        { sleepSecs: START_STOP_POLLING_SLEEP_SECONDS, timeoutSecs: 90 } // wait up to 90 seconds for the task to start
      );

      this.startPolling();

      this.telemetry.reportStartTranslation(params);
      return result;
    } catch (error) {
      this.telemetry.reportStartTranslation({ ...params, error });
      throw error;
    }
  }

  /** Stops a running rule migration task and waits for the task to completely stop */
  public async stopRuleMigration(migrationId: string): Promise<StopRuleMigrationResponse> {
    const missingCapabilities = this.getMissingCapabilities('all');
    if (missingCapabilities.length > 0) {
      this.core.notifications.toasts.add(
        getMissingCapabilitiesToast(missingCapabilities, this.core)
      );
      return { stopped: false };
    }

    const params: api.StopRuleMigrationParams = { migrationId };
    try {
      const result = await api.stopRuleMigration(params);

      // Should take a few seconds to stop the task, so we poll until it is not running anymore
      await this.migrationTaskPollingUntil(
        migrationId,
        ({ status }) => status !== SiemMigrationTaskStatus.RUNNING, // may be STOPPED, FINISHED or INTERRUPTED
        { sleepSecs: START_STOP_POLLING_SLEEP_SECONDS, timeoutSecs: 90 } // wait up to 90 seconds for the task to stop
      );

      this.telemetry.reportStopTranslation(params);
      return result;
    } catch (error) {
      this.telemetry.reportStopTranslation({ ...params, error });
      throw error;
    }
  }

  /** Gets the rule migrations stats, retrying on network errors or 503 status */
  public async getRuleMigrationsStats(
    params: api.GetRuleMigrationsStatsAllParams = {}
  ): Promise<RuleMigrationStats[]> {
    const allStats = await this.getRuleMigrationsStatsWithRetry(params);
    this.latestStats$.next(allStats); // Keep the latest stats observable in sync
    return allStats;
  }

  private sleep(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  /** Polls the migration task stats until the finish condition is met or the timeout is reached. */
  private async migrationTaskPollingUntil(
    migrationId: string,
    finishCondition: (stats: RuleMigrationStats) => boolean,
    { sleepSecs = 1, timeoutSecs = 60 }: { sleepSecs?: number; timeoutSecs?: number } = {}
  ): Promise<void> {
    const timeoutId = setTimeout(() => {
      throw new Error('Migration task polling timed out');
    }, timeoutSecs * 1000);

    let retry = true;
    do {
      const stats = await api.getRuleMigrationStats({ migrationId });
      if (finishCondition(stats)) {
        clearTimeout(timeoutId);
        retry = false;
      } else {
        await this.sleep(sleepSecs);
      }
    } while (retry);
    // updates the latest stats observable for all migrations to make sure they are in sync
    await this.getRuleMigrationsStats();
  }

  /** Retries the API call to get rule migrations stats in case of network errors or 503 status */
  private async getRuleMigrationsStatsWithRetry(
    params: api.GetRuleMigrationsStatsAllParams = {},
    sleepSecs?: number
  ): Promise<RuleMigrationStats[]> {
    if (sleepSecs) {
      await this.sleep(sleepSecs);
    }

    return api.getRuleMigrationsStatsAll(params).catch((e) => {
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
      return this.getRuleMigrationsStatsWithRetry(params, nextSleepSecs);
    });
  }

  /** Starts polling the rule migrations stats and handles the notifications for finished migrations */
  private async startTaskStatsPolling(): Promise<void> {
    let pendingMigrationIds: string[] = [];
    do {
      const results = await this.getRuleMigrationsStats();

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
          const skipPrebuiltRulesMatching = result.last_execution?.skip_prebuilt_rules_matching;
          if (connectorId && !this.hasMissingCapabilities('all')) {
            await api.startRuleMigration({
              migrationId: result.id,
              settings: { connectorId, skipPrebuiltRulesMatching },
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
}
