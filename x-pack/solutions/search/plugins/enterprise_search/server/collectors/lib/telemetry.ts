/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ISavedObjectsRepository,
  SavedObjectsServiceStart,
  SavedObjectAttributes,
  Logger,
} from '@kbn/core/server';

// This throws `Error: Cannot find module 'src/core/server'` if I import it via alias ¯\_(ツ)_/¯
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

/**
 * Fetches saved objects attributes - used by collectors
 */

export const getSavedObjectAttributesFromRepo = async (
  id: string, // Telemetry name
  savedObjectsRepository: ISavedObjectsRepository,
  log: Logger
): Promise<SavedObjectAttributes | null> => {
  try {
    return (await savedObjectsRepository.get(id, id)).attributes as SavedObjectAttributes;
  } catch (e) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
      log.warn(`Failed to retrieve ${id} telemetry data: ${e}`);
    }
    return null;
  }
};

/**
 * Set saved objection attributes - used by telemetry route
 */

interface IncrementUICounter {
  id: string; // Telemetry name
  savedObjects: SavedObjectsServiceStart;
  uiAction: string;
  metric: string;
}

export async function incrementUICounter({
  id,
  savedObjects,
  uiAction,
  metric,
}: IncrementUICounter) {
  const internalRepository = savedObjects.createInternalRepository();

  await internalRepository.incrementCounter(
    id,
    id,
    [`${uiAction}.${metric}`] // e.g., ui_viewed.setup_guide
  );

  return { success: true };
}
