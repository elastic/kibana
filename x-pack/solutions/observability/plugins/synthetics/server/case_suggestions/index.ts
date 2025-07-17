/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import { getSyntheticsMonitorSuggestionType } from './synthetics_monitor';

export const getSuggestionTypes = (dependencies: {
  savedObjectsClient: SavedObjectsClientContract;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  share: SharePluginStart;
}) => {
  const syntheticsMonitorSuggestionType = getSyntheticsMonitorSuggestionType({
    savedObjectClient: dependencies.savedObjectsClient,
    encryptedSavedObjectsClient: dependencies.encryptedSavedObjectsClient,
    share: dependencies.share,
  });
  return [syntheticsMonitorSuggestionType];
};
