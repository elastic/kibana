/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsServiceSetup } from '@kbn/core/server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';

import {
  getSyntheticsMonitorConfigSavedObjectType,
  SYNTHETICS_MONITOR_ENCRYPTED_TYPE,
} from './synthetics_monitor/synthetics_monitor_config';
import { syntheticsSettings } from './synthetics_settings';
import {
  SYNTHETICS_PARAMS_SECRET_ENCRYPTED_TYPE,
  syntheticsParamSavedObjectType,
} from './synthetics_param';
import {
  LEGACY_PRIVATE_LOCATIONS_SAVED_OBJECT_TYPE,
  PRIVATE_LOCATION_SAVED_OBJECT_TYPE,
} from './private_locations';
import {
  getLegacySyntheticsMonitorSavedObjectType,
  LEGACY_SYNTHETICS_MONITOR_ENCRYPTED_TYPE_SINGLE,
} from './synthetics_monitor/legacy_synthetics_monitor';
import { syntheticsServiceApiKey } from './service_api_key';

export const registerSyntheticsSavedObjects = (
  savedObjectsService: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) => {
  savedObjectsService.registerType(LEGACY_PRIVATE_LOCATIONS_SAVED_OBJECT_TYPE);
  savedObjectsService.registerType(PRIVATE_LOCATION_SAVED_OBJECT_TYPE);

  savedObjectsService.registerType(syntheticsSettings);

  // legacy synthetics monitor saved object type which is single namespace
  savedObjectsService.registerType(
    getLegacySyntheticsMonitorSavedObjectType(encryptedSavedObjects)
  );
  encryptedSavedObjects.registerType(LEGACY_SYNTHETICS_MONITOR_ENCRYPTED_TYPE_SINGLE);

  // synthetics monitor config saved object type which supports multiple namespace
  savedObjectsService.registerType(getSyntheticsMonitorConfigSavedObjectType());
  encryptedSavedObjects.registerType(SYNTHETICS_MONITOR_ENCRYPTED_TYPE);

  // service api key saved object type
  savedObjectsService.registerType(syntheticsServiceApiKey);
  encryptedSavedObjects.registerType({
    type: syntheticsServiceApiKey.name,
    attributesToEncrypt: new Set(['apiKey']),
    attributesToIncludeInAAD: new Set(['id', 'name']),
  });

  // global params saved object type
  savedObjectsService.registerType(syntheticsParamSavedObjectType);
  encryptedSavedObjects.registerType(SYNTHETICS_PARAMS_SECRET_ENCRYPTED_TYPE);
};
