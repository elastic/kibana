/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, Logger, SavedObjectsFindResult } from '@kbn/core/server';
import type { TagWithOptionalId } from '@kbn/saved-objects-tagging-oss-plugin/common';
import { SECURITY_TAG_NAME } from '../../../common/constants';

interface GetDashboardMetricsOptions {
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

export const getSecurityTag = async ({
  savedObjectsClient,
  logger,
}: GetDashboardMetricsOptions): Promise<SavedObjectsFindResult<TagWithOptionalId> | undefined> => {
  const tagResponse = await savedObjectsClient.find<TagWithOptionalId>({
    type: 'tag',
    searchFields: ['name'],
    search: SECURITY_TAG_NAME,
  });
  // The search query returns partial matches, we need to find the exact tag name
  return tagResponse.saved_objects.find(({ attributes }) => attributes.name === SECURITY_TAG_NAME);
};

export const initialDashboardMetrics = {};

export const getDashboardMetrics = async ({
  savedObjectsClient,
  logger,
}: GetDashboardMetricsOptions) => {
  const tag = await getSecurityTag({ savedObjectsClient, logger });
  const tagId = tag?.id;
  if (!tagId) {
    logger.debug(`No ${SECURITY_TAG_NAME} tag found, therefore not collecting telemetry from it`);
    return initialDashboardMetrics;
  }
  const dashboardsResponse = await savedObjectsClient.find({
    type: 'dashboard',
    hasReference: { id: tagId, type: 'tag' },
  });
  return {
    dashboard_tag: {
      created_at: tag.created_at,
      linked_dashboards_count: dashboardsResponse.saved_objects.length,
    },
    dashboards: dashboardsResponse.saved_objects.map((d) => ({
      created_at: d.created_at,
      dashboard_id: d.id,
      ...(d?.error?.message ? { error_message: d?.error?.message } : {}),
      ...(d?.error?.statusCode ? { error_status_code: d?.error?.statusCode } : {}),
    })),
  };
};
