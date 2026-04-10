/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { SyntheticsCCSSettings } from '../../common/runtime_types';
import {
  SO_SYNTHETICS_CCS_SETTINGS_TYPE,
  syntheticsCCSSettingsObjectId,
} from '../saved_objects/synthetics_ccs_settings';

export interface SyntheticsCCSSettingsRepository {
  get(): Promise<SyntheticsCCSSettings>;
  save(settings: SyntheticsCCSSettings): Promise<SyntheticsCCSSettings>;
}

export const DEFAULT_CCS_SETTINGS: SyntheticsCCSSettings = {
  useAllRemoteClusters: false,
  selectedRemoteClusters: [],
  remoteKibanaUrls: {},
};

export class DefaultSyntheticsCCSSettingsRepository implements SyntheticsCCSSettingsRepository {
  constructor(private soClient: SavedObjectsClientContract) {}

  async get(): Promise<SyntheticsCCSSettings> {
    try {
      const response = await this.soClient.get<SyntheticsCCSSettings>(
        SO_SYNTHETICS_CCS_SETTINGS_TYPE,
        syntheticsCCSSettingsObjectId(this.soClient.getCurrentNamespace())
      );

      return response.attributes;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return DEFAULT_CCS_SETTINGS;
      }
      throw e;
    }
  }

  async save(settings: SyntheticsCCSSettings): Promise<SyntheticsCCSSettings> {
    const response = await this.soClient.create<SyntheticsCCSSettings>(
      SO_SYNTHETICS_CCS_SETTINGS_TYPE,
      settings,
      {
        id: syntheticsCCSSettingsObjectId(this.soClient.getCurrentNamespace()),
        overwrite: true,
      }
    );

    return response.attributes;
  }
}
