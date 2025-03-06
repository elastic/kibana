/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { ErrorCode } from '../../../common/types/error_codes';
import { isResourceNotFoundException } from '../../utils/identify_exceptions';

export const deleteAnalyticsCollectionById = async (client: IScopedClusterClient, name: string) => {
  try {
    await client.asCurrentUser.searchApplication.deleteBehavioralAnalytics({ name });
  } catch (error) {
    if (isResourceNotFoundException(error)) {
      throw new Error(ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND);
    }
    throw error;
  }
};
