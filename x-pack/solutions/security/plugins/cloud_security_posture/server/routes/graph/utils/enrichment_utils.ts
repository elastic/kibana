/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';

/**
 * Checks if the entities latest index exists.
 * Previously checked for lookup mode (required for LOOKUP JOIN), but since
 * enrichment now uses follow-up queries, only existence matters.
 */
export const checkIfEntitiesIndexExists = async (
  esClient: IScopedClusterClient,
  logger: Logger,
  spaceId: string
): Promise<boolean> => {
  const indexName = getEntitiesLatestIndexName(spaceId);
  try {
    const exists = await esClient.asInternalUser.indices.exists({ index: indexName });
    if (!exists) {
      logger.debug(`Entities index ${indexName} does not exist`);
    }
    return exists;
  } catch (error) {
    logger.error(`Error checking entities index ${indexName}: ${error.message}`);
    return false;
  }
};
