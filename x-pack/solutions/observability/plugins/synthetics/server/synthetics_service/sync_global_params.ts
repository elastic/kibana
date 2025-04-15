/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server/plugin';
import { SavedObjectsServiceStart } from '@kbn/core/server';
import pRetry from 'p-retry';
import { getPrivateLocations } from './get_private_locations';
import { SyntheticsMonitorClient } from './synthetics_monitor/synthetics_monitor_client';

export const syncSpaceGlobalParams = async ({
  spaceId,
  savedObjects,
  logger,
  syntheticsMonitorClient,
  encryptedSavedObjects,
}: {
  spaceId: string;
  savedObjects: SavedObjectsServiceStart;
  logger: Logger;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}) => {
  try {
    await pRetry(async () => {
      logger.debug(`Syncing global parameters of space with id ${spaceId}`);
      const savedObjectsClient = savedObjects.createInternalRepository();
      const allPrivateLocations = await getPrivateLocations(savedObjectsClient);
      await syntheticsMonitorClient.syncGlobalParams({
        spaceId,
        allPrivateLocations,
        soClient: savedObjectsClient,
        encryptedSavedObjects,
      });
      logger.debug(`Sync of global parameters for space with id ${spaceId} succeeded`);
    });
  } catch (error) {
    logger.error(`Sync of global parameters for space with id ${spaceId} failed: ${error.message}`);
  }
};
