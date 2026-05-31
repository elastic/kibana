/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type {
  PluginSetupContract as ActionsPluginSetupContract,
  PluginStartContract as ActionsPluginStartContract,
} from '@kbn/actions-plugin/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

export interface SdlcIntelServices {
  actionsSetup: ActionsPluginSetupContract;
  actionsStart: ActionsPluginStartContract;
  coreStart: CoreStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  logger: Logger;
  spaces?: SpacesPluginStart;
}

let services: SdlcIntelServices | undefined;

export const setSdlcIntelServices = (nextServices: SdlcIntelServices): void => {
  services = nextServices;
};

export const getSdlcIntelServices = (): SdlcIntelServices => {
  if (!services) {
    throw new Error('sdlcIntel: plugin services are not available');
  }
  return services;
};
