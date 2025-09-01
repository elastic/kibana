/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { TraceOptions } from '@kbn/elastic-assistant/impl/assistant/types';
import type { StartPluginsDependencies } from '../../../types';
import * as i18n from './translations';
import type { CapabilitiesLevel, MissingCapability } from './capabilities';
import { SiemMigrationsStorage } from './storage';
import { NAMESPACE_TRACE_OPTIONS_SESSION_STORAGE_KEY } from '../constants';

export abstract class SiemMigrationsItemService {
  protected abstract isPolling: boolean;
  protected abstract startTaskStatsPolling(): Promise<void>;

  protected readonly core: CoreStart;
  protected readonly plugins: StartPluginsDependencies;

  public connectorIdStorage = new SiemMigrationsStorage<string>('connectorId');
  public traceOptionsStorage = new SiemMigrationsStorage<TraceOptions>('traceOptions', undefined, {
    customKey: NAMESPACE_TRACE_OPTIONS_SESSION_STORAGE_KEY,
    storageType: 'session',
  });

  constructor(core: CoreStart, plugins: StartPluginsDependencies) {
    this.core = core;
    this.plugins = plugins;
  }

  public abstract getMissingCapabilities(level?: CapabilitiesLevel): MissingCapability[];

  public abstract hasMissingCapabilities(level?: CapabilitiesLevel): boolean;

  public abstract isAvailable(): boolean;

  /** Starts pollingmigrations stats if not already polling and if the feature is available to the user */
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

  protected sleep(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  protected abstract updateLatestStats(): Promise<void>;

  /** Polls the migration task stats until the finish condition is met or the timeout is reached. */
  protected async pollTaskUntil<T>(
    taskExecutor: () => Promise<T>,
    finishCondition: (result: T) => boolean,
    { sleepSecs = 1, timeoutSecs = 60 }: { sleepSecs?: number; timeoutSecs?: number } = {}
  ): Promise<void> {
    const timeoutId = setTimeout(() => {
      throw new Error('task polling timed out');
    }, timeoutSecs * 1000);

    let retry = true;
    do {
      const result = await taskExecutor();
      if (finishCondition(result)) {
        clearTimeout(timeoutId);
        retry = false;
      } else {
        await this.sleep(sleepSecs);
      }
    } while (retry);
    // updates the latest stats observable for all migrations to make sure they are in sync
    await this.updateLatestStats();
  }
}
