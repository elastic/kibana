/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { DEFAULT_STALE_SLO_THRESHOLD_HOURS } from '../../common/constants';
import type { SLOSettings, StoredSLOSettings } from '../domain/models';
import { SO_SLO_SETTINGS_TYPE, sloSettingsObjectId } from '../saved_objects/slo_settings';

export interface SLOSettingsRepository {
  get(): Promise<SLOSettings>;
  save(settings: SLOSettings): Promise<SLOSettings>;
}

export const DEFAULT_SETTINGS: SLOSettings = {
  useAllRemoteClusters: false,
  selectedRemoteClusters: [],
  staleThresholdInHours: DEFAULT_STALE_SLO_THRESHOLD_HOURS,
  staleInstancesCleanupEnabled: false,
};

export class DefaultSLOSettingsRepository implements SLOSettingsRepository {
  constructor(private soClient: SavedObjectsClientContract) {}

  async get(): Promise<SLOSettings> {
    try {
      const response = await this.soClient.get<StoredSLOSettings>(
        SO_SLO_SETTINGS_TYPE,
        sloSettingsObjectId(this.soClient.getCurrentNamespace())
      );

      return this.toSloSettings(response.attributes);
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return DEFAULT_SETTINGS;
      }
      throw e;
    }
  }

  async save(settings: SLOSettings): Promise<SLOSettings> {
    const response = await this.soClient.create<StoredSLOSettings>(
      SO_SLO_SETTINGS_TYPE,
      this.toStoredSloSettings(settings),
      {
        id: sloSettingsObjectId(this.soClient.getCurrentNamespace()),
        overwrite: true,
      }
    );

    return this.toSloSettings(response.attributes);
  }

  private toSloSettings(stored: StoredSLOSettings): SLOSettings {
    try {
      return {
        useAllRemoteClusters: stored.useAllRemoteClusters,
        selectedRemoteClusters: stored.selectedRemoteClusters,
        staleThresholdInHours: stored.staleThresholdInHours ?? DEFAULT_STALE_SLO_THRESHOLD_HOURS,
        staleInstancesCleanupEnabled: stored.staleInstancesCleanupEnabled === true ? true : false,
      };
    } catch {
      // In case of corrupted saved object, return default settings
      return DEFAULT_SETTINGS;
    }
  }

  private toStoredSloSettings(settings: SLOSettings): StoredSLOSettings {
    return {
      useAllRemoteClusters: settings.useAllRemoteClusters,
      selectedRemoteClusters: settings.selectedRemoteClusters,
      staleThresholdInHours: settings.staleThresholdInHours,
      staleInstancesCleanupEnabled: settings.staleInstancesCleanupEnabled,
    };
  }
}
