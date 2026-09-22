/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERTS_BATCH_MAX_SIZE, ESSENTIAL_ALERT_FIELDS } from '../../../common/constants';

/**
 * Fetches alerts by their _id values from Elasticsearch, returning only essential fields.
 */
export const getAlertsById = async ({
  esClient,
  index,
  ids,
}: {
  esClient: ElasticsearchClient;
  index: string;
  ids: string[];
}): Promise<Record<string, unknown>> => {
  if (ids.length === 0) {
    return {};
  }
  if (ids.length > ALERTS_BATCH_MAX_SIZE) {
    throw new Error(
      `getAlertsById: ids.length (${ids.length}) exceeds the maximum of ${ALERTS_BATCH_MAX_SIZE}`
    );
  }

  const response = await esClient.search({
    index,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: ids.length,
    _source: ESSENTIAL_ALERT_FIELDS,
    query: {
      bool: {
        filter: [{ terms: { _id: ids } }],
      },
    },
  });

  return response.hits.hits.reduce<Record<string, unknown>>((acc, hit) => {
    if (hit._source && hit._id) {
      acc[hit._id] = hit._source;
    }
    return acc;
  }, {});
};
