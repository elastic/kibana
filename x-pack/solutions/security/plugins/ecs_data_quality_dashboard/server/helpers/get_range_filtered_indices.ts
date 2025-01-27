/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';

import { fetchAvailableIndices } from '../lib/fetch_available_indices';

export const getRangeFilteredIndices = async ({
  client,
  authorizedIndexNames,
  startDate,
  endDate,
  logger,
  pattern,
}: {
  client: IScopedClusterClient;
  authorizedIndexNames: string[];
  startDate: string;
  endDate: string;
  logger: Logger;
  pattern: string;
}): Promise<string[]> => {
  const decodedStartDate = decodeURIComponent(startDate);
  const decodedEndDate = decodeURIComponent(endDate);
  try {
    const currentUserEsClient = client.asCurrentUser;

    const availableIndicesPromises: Array<Promise<string[]>> = [];

    for (const indexName of authorizedIndexNames) {
      availableIndicesPromises.push(
        fetchAvailableIndices(currentUserEsClient, {
          indexNameOrPattern: indexName,
          startDate: decodedStartDate,
          endDate: decodedEndDate,
        })
      );
    }

    const availableIndices = await Promise.all(availableIndicesPromises);

    const flattenedAvailableIndices = availableIndices.flat();

    if (flattenedAvailableIndices.length === 0) {
      logger.warn(
        `No available authorized indices found under pattern: ${pattern}, in the given date range: ${decodedStartDate} - ${decodedEndDate}`
      );
    }

    return flattenedAvailableIndices;
  } catch (err) {
    logger.error(
      `Error fetching available indices in the given data range: ${decodedStartDate} - ${decodedEndDate}`
    );
    return [];
  }
};
