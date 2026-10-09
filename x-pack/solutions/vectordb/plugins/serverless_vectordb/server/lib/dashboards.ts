/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';

/**
 * Fetches the number of dashboards in the current space. Returns `null` on failure so
 * a lookup error is distinguishable from "0 dashboards".
 */
export const fetchDashboardsCount = async (
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger
): Promise<number | null> => {
  try {
    const result = await savedObjectsClient.find({ type: 'dashboard', perPage: 0 });
    return result.total;
  } catch (error) {
    logger.warn(`Failed to fetch dashboard count for vectordb deployment stats: ${error.message}`);
    return null;
  }
};

/**
 * Counts how many of the given dashboards still exist in the current space. Deleting a dashboard
 * does not remove it from a user's favorites, so favorited IDs have to be resolved against the
 * saved objects they point at. Returns `null` on failure so a lookup error is distinguishable from
 * "0 starred dashboards".
 */
export const countExistingDashboards = async (
  savedObjectsClient: SavedObjectsClientContract,
  dashboardIds: readonly string[],
  logger: Logger
): Promise<number | null> => {
  if (dashboardIds.length === 0) {
    return 0;
  }

  try {
    const { saved_objects: dashboards } = await savedObjectsClient.bulkGet(
      // Specifying the 'title' field here is a narrow way to avoid pulling every dashboard's panel JSON.
      dashboardIds.map((id) => ({ type: 'dashboard', id, fields: ['title'] }))
    );

    return dashboards.filter((dashboard) => !isSavedObjectErrorResult(dashboard)).length;
  } catch (error) {
    logger.warn(
      `Failed to resolve starred dashboards for vectordb deployment stats: ${error.message}`
    );
    return null;
  }
};
