/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { BehaviorSubject, distinctUntilChanged, type Observable } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { TraceOptions } from '@kbn/elastic-assistant/impl/assistant/types';
import {
  DEFAULT_ASSISTANT_NAMESPACE,
  TRACE_OPTIONS_SESSION_STORAGE_KEY,
} from '@kbn/elastic-assistant/impl/assistant_context/constants';

import type { MigrationTaskStats } from '../../../../common/siem_migrations/model/common.gen';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import type { StartPluginsDependencies } from '../../../types';
import { type MissingCapability, type CapabilitiesLevel } from './capabilities';
import { MigrationsStorage } from './storage';
import * as i18n from './translations';
import type { GetMigrationStatsParams, GetMigrationsStatsAllParams } from '../types';
import { TASK_STATS_POLLING_SLEEP_SECONDS } from '../constants';

// use the default assistant namespace since it's the only one we use
const NAMESPACE_TRACE_OPTIONS_SESSION_STORAGE_KEY =
  `${DEFAULT_ASSISTANT_NAMESPACE}.${TRACE_OPTIONS_SESSION_STORAGE_KEY}` as const;

export abstract class SiemMigrationsServiceBase<T extends MigrationTaskStats> {
  protected abstract startMigrationFromStats(params: {
    connectorId: string;
    taskStats: T;
  }): Promise<void>;
  protected abstract fetchMigrationStats(params: GetMigrationStatsParams): Promise<T>;
  protected abstract fetchMigrationsStatsAll(params: GetMigrationsStatsAllParams): Promise<T[]>;
  protected abstract sendFinishedMigrationNotification(taskStats: T): void;

  public abstract isAvailable(): boolean;
  public abstract getMissingCapabilities(level?: CapabilitiesLevel): MissingCapability[];

  private readonly latestStats$: BehaviorSubject<T[] | null>;
  private isPolling = false;
  public connectorIdStorage: MigrationsStorage<string>;
  public traceOptionsStorage: MigrationsStorage<TraceOptions>;

  constructor(
    protected readonly core: CoreStart,
    private readonly plugins: StartPluginsDependencies
  ) {
    this.connectorIdStorage = new MigrationsStorage<string>('connectorId');
    this.traceOptionsStorage = new MigrationsStorage<TraceOptions>('traceOptions', {
      customKey: NAMESPACE_TRACE_OPTIONS_SESSION_STORAGE_KEY,
      storageType: 'session',
    });

    this.latestStats$ = new BehaviorSubject<T[] | null>(null);

    this.plugins.spaces.getActiveSpace().then((space) => {
      this.connectorIdStorage.setSpaceId(space.id);
      if (this.isAvailable()) {
        this.startPolling();
      }
    });
  }

  /** Returns the latest stats observable, which is updated every time the stats are fetched */
  public getLatestStats$(): Observable<T[] | null> {
    return this.latestStats$.asObservable().pipe(distinctUntilChanged(isEqual));
  }

  /** Checks if the user has any missing capabilities for this feature */
  public hasMissingCapabilities(level?: CapabilitiesLevel): boolean {
    return this.getMissingCapabilities(level).length > 0;
  }

  /** Starts polling the migrations stats if not already polling and if the feature is available to the user */
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

  /** Gets the migrations stats, retrying on network errors or 503 status */
  public async getMigrationsStats(params: GetMigrationsStatsAllParams = {}): Promise<T[]> {
    const allStats = await this.getMigrationsStatsWithRetry(params);
    this.latestStats$.next(allStats); // Keep the latest stats observable in sync
    return allStats;
  }

  private sleep(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  /** Polls the migration task stats until the finish condition is met or the timeout is reached. */
  protected async migrationTaskPollingUntil(
    migrationId: string,
    finishCondition: (stats: T) => boolean,
    { sleepSecs = 1, timeoutSecs = 60 }: { sleepSecs?: number; timeoutSecs?: number } = {}
  ): Promise<void> {
    const timeoutId = setTimeout(() => {
      throw new Error('Migration task polling timed out');
    }, timeoutSecs * 1000);

    let retry = true;
    do {
      const stats = await this.fetchMigrationStats({ migrationId });
      if (finishCondition(stats)) {
        clearTimeout(timeoutId);
        retry = false;
      } else {
        await this.sleep(sleepSecs);
      }
    } while (retry);
    // updates the latest stats observable for all migrations to make sure they are in sync
    await this.getMigrationsStats();
  }

  /** Retries the API call to get migrations stats in case of network errors or 503 status */
  private async getMigrationsStatsWithRetry(
    params: GetMigrationsStatsAllParams = {},
    sleepSecs?: number
  ): Promise<T[]> {
    if (sleepSecs) {
      await this.sleep(sleepSecs);
    }

    return this.fetchMigrationsStatsAll(params).catch((e) => {
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
      return this.getMigrationsStatsWithRetry(params, nextSleepSecs);
    });
  }

  /** Starts polling the migrations stats and handles the notifications for finished migrations */
  private async startTaskStatsPolling(): Promise<void> {
    let pendingMigrationIds: string[] = [];
    do {
      const results = await this.getMigrationsStats();

      if (pendingMigrationIds.length > 0) {
        // send notifications for finished migrations
        pendingMigrationIds.forEach((pendingMigrationId) => {
          const migrationStats = results.find((item) => item.id === pendingMigrationId);
          if (migrationStats?.status === SiemMigrationTaskStatus.FINISHED) {
            this.sendFinishedMigrationNotification(migrationStats);
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
          if (connectorId && !this.hasMissingCapabilities('minimum')) {
            await this.startMigrationFromStats({ connectorId, taskStats: result });
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
