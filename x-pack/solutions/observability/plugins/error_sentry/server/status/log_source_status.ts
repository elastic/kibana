/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { CAPTURE_LOG_INDEX_DEFAULT } from '../../common/constants';
import type { ComponentStatus } from '../../common/constants';

export const getLogSourceStatus = async (
  esClient: ElasticsearchClient
): Promise<ComponentStatus> => {
  let exists = false;
  let hasRecentData = false;

  try {
    const existsResponse = await esClient.indices.exists({ index: CAPTURE_LOG_INDEX_DEFAULT });
    exists = existsResponse;

    if (exists) {
      const countResponse = await esClient.count({
        index: CAPTURE_LOG_INDEX_DEFAULT,
        query: { range: { '@timestamp': { gte: 'now-7d' } } },
      });
      hasRecentData = countResponse.count > 0;
    }
  } catch {
    // Index may not exist yet
  }

  if (!exists) {
    return {
      id: 'log_source',
      label: `Log source (${CAPTURE_LOG_INDEX_DEFAULT})`,
      state: 'missing',
      detail: `Index ${CAPTURE_LOG_INDEX_DEFAULT} does not exist. Send OTel logs to Elasticsearch to populate it.`,
      repairable: false,
    };
  }

  if (!hasRecentData) {
    return {
      id: 'log_source',
      label: `Log source (${CAPTURE_LOG_INDEX_DEFAULT})`,
      state: 'warning',
      detail: `Index ${CAPTURE_LOG_INDEX_DEFAULT} exists but has no data in the last 7 days. The capture workflow will run but may not find any patterns.`,
      repairable: false,
    };
  }

  return {
    id: 'log_source',
    label: `Log source (${CAPTURE_LOG_INDEX_DEFAULT})`,
    state: 'ok',
    detail: `${CAPTURE_LOG_INDEX_DEFAULT} is present and has recent data.`,
    repairable: false,
  };
};
