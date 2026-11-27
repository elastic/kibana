/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/core/server';
import { sloGlobalSettingsSchema } from '@kbn/slo-schema';
import type {
  SLOGlobalSettings,
  SLOGlobalSettingsUpdate,
  StoredSLOGlobalSettings,
} from '../../domain/models';
import { SLO_GLOBAL_SETTINGS_ID, SO_SLO_GLOBAL_SETTINGS_TYPE } from '../../saved_objects';

export interface SLOGlobalSettingsRepository {
  get(): Promise<SLOGlobalSettings>;
  save(update: SLOGlobalSettingsUpdate): Promise<SLOGlobalSettings>;
}

export class DefaultSLOGlobalSettingsRepository implements SLOGlobalSettingsRepository {
  constructor(private soClient: SavedObjectsClientContract, private logger: Logger) {}

  /** Returns the stored settings, or none when the saved object is missing or invalid. */
  async get(): Promise<SLOGlobalSettings> {
    const stored = await this.findStored();
    if (!stored) {
      return {};
    }

    const result = sloGlobalSettingsSchema.safeParse(stored);
    if (!result.success) {
      this.logger.warn(`Invalid stored global SLO settings: ${result.error.message}`);
      return {};
    }

    return result.data;
  }

  /** Writes the given setting blocks stamped with the current date, leaving the other stored blocks untouched. */
  async save({ sliRetention }: SLOGlobalSettingsUpdate): Promise<SLOGlobalSettings> {
    const updatedAt = new Date();
    const settings: SLOGlobalSettings = {
      ...(sliRetention && { sliRetention: { ...sliRetention, updatedAt } }),
    };
    const toStore = sloGlobalSettingsSchema.encode(settings);

    await this.soClient.update<StoredSLOGlobalSettings>(
      SO_SLO_GLOBAL_SETTINGS_TYPE,
      SLO_GLOBAL_SETTINGS_ID,
      toStore,
      { upsert: toStore }
    );

    return settings;
  }

  private async findStored(): Promise<StoredSLOGlobalSettings | undefined> {
    try {
      const { attributes } = await this.soClient.get<StoredSLOGlobalSettings>(
        SO_SLO_GLOBAL_SETTINGS_TYPE,
        SLO_GLOBAL_SETTINGS_ID
      );
      return attributes;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return undefined;
      }
      throw e;
    }
  }
}
