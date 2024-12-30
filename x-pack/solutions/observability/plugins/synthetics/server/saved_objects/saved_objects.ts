/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
  SavedObjectsServiceSetup,
} from '@kbn/core/server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';

import { fromSettingsAttribute } from '../routes/settings/dynamic_settings';
import {
  syntheticsSettings,
  syntheticsSettingsObjectId,
  syntheticsSettingsObjectType,
  uptimeSettingsObjectId,
  uptimeSettingsObjectType,
} from './synthetics_settings';
import {
  SYNTHETICS_SECRET_ENCRYPTED_TYPE,
  syntheticsParamSavedObjectType,
} from './synthetics_param';
import {
  LEGACY_PRIVATE_LOCATIONS_SAVED_OBJECT_TYPE,
  PRIVATE_LOCATION_SAVED_OBJECT_TYPE,
} from './private_locations';
import { DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES } from '../constants/settings';
import { DynamicSettingsAttributes } from '../runtime_types/settings';
import {
  getSyntheticsMonitorSavedObjectType,
  SYNTHETICS_MONITOR_ENCRYPTED_TYPE,
} from './synthetics_monitor';
import { syntheticsServiceApiKey } from './service_api_key';

export const registerSyntheticsSavedObjects = (
  savedObjectsService: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) => {
  savedObjectsService.registerType(LEGACY_PRIVATE_LOCATIONS_SAVED_OBJECT_TYPE);
  savedObjectsService.registerType(PRIVATE_LOCATION_SAVED_OBJECT_TYPE);

  savedObjectsService.registerType(getSyntheticsMonitorSavedObjectType(encryptedSavedObjects));
  savedObjectsService.registerType(syntheticsServiceApiKey);
  savedObjectsService.registerType(syntheticsParamSavedObjectType);
  savedObjectsService.registerType(syntheticsSettings);

  encryptedSavedObjects.registerType({
    type: syntheticsServiceApiKey.name,
    attributesToEncrypt: new Set(['apiKey']),
    attributesToIncludeInAAD: new Set(['id', 'name']),
  });

  encryptedSavedObjects.registerType(SYNTHETICS_MONITOR_ENCRYPTED_TYPE);
  encryptedSavedObjects.registerType(SYNTHETICS_SECRET_ENCRYPTED_TYPE);
};

export const savedObjectsAdapter = {
  getSyntheticsDynamicSettings: async (
    client: SavedObjectsClientContract
  ): Promise<DynamicSettingsAttributes> => {
    try {
      const obj = await client.get<DynamicSettingsAttributes>(
        syntheticsSettingsObjectType,
        syntheticsSettingsObjectId
      );
      return fromSettingsAttribute(obj?.attributes ?? DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES);
    } catch (getErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        // If the object doesn't exist, check to see if uptime settings exist
        return getUptimeDynamicSettings(client);
      }
      throw getErr;
    }
  },
  setSyntheticsDynamicSettings: async (
    client: SavedObjectsClientContract,
    settings: DynamicSettingsAttributes
  ) => {
    const settingsObject = await client.create<DynamicSettingsAttributes>(
      syntheticsSettingsObjectType,
      settings,
      {
        id: syntheticsSettingsObjectId,
        overwrite: true,
      }
    );

    return settingsObject.attributes;
  },
};

const getUptimeDynamicSettings = async (client: SavedObjectsClientContract) => {
  try {
    const obj = await client.get<DynamicSettingsAttributes>(
      uptimeSettingsObjectType,
      uptimeSettingsObjectId
    );
    return obj?.attributes ?? DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES;
  } catch (getErr) {
    return DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES;
  }
};
