/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';

/**
 * Checks if the entities latest index exists and is configured in lookup mode.
 */
export const checkIfEntitiesIndexLookupMode = async (
  esClient: IScopedClusterClient,
  logger: Logger,
  spaceId: string
): Promise<boolean> => {
  const indexName = getEntitiesLatestIndexName(spaceId);
  try {
    const response = await esClient.asInternalUser.indices.getSettings({
      index: indexName,
    });
    const indexSettings = response[indexName];
    if (!indexSettings) {
      logger.debug(`Entities index ${indexName} not found`);
      return false;
    }

    // Check if index is in lookup mode
    const mode = indexSettings.settings?.index?.mode;
    const isLookupMode = mode === 'lookup';

    if (!isLookupMode) {
      logger.debug(`Entities index ${indexName} exists but is not in lookup mode (mode: ${mode})`);
    }

    return isLookupMode;
  } catch (error) {
    if (error.statusCode === 404) {
      logger.debug(`Entities index ${indexName} does not exist`);
      return false;
    }
    logger.error(`Error checking entities index ${indexName}: ${error.message}`);
    return false;
  }
};
