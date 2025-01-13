/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { isIndexNotFoundException } from '../../utils/identify_exceptions';

export const analyticsEventsExist = async (
  client: IScopedClusterClient,
  datastreamName: string
): Promise<boolean> => {
  try {
    const response = await client.asCurrentUser.count({
      index: datastreamName,
    });
    return response.count > 0;
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      return false;
    }
    throw error;
  }
};
