/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { SavedObjectsErrorHelpers, SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { DynamicSettingsAttributes } from '../runtime_types/settings';
import { fromSettingsAttribute } from '../routes/settings/dynamic_settings';
import { DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES } from '../constants/settings';

export const uptimeSettingsObjectType = 'uptime-dynamic-settings';
export const uptimeSettingsObjectId = 'uptime-dynamic-settings-singleton';

export const syntheticsSettingsObjectType = 'synthetics-dynamic-settings';
export const syntheticsSettingsObjectId = 'synthetics-dynamic-settings-singleton';

export const syntheticsSettings: SavedObjectsType = {
  name: syntheticsSettingsObjectType,
  hidden: false,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    importableAndExportable: true,
    icon: 'uptimeApp',
    getTitle: () =>
      i18n.translate('xpack.synthetics.settings.index', {
        defaultMessage: 'Synthetics settings',
      }),
  },
};

export const getSyntheticsDynamicSettings = async (
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
};
export const setSyntheticsDynamicSettings = async (
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
