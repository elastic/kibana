/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { CAPTURE_LOG_INDEX_DEFAULT } from '../../common/constants';
import type { CaptureConfig, ComponentStatus } from '../../common/constants';

export const getLogSourceStatus = async (
  esClient: ElasticsearchClient,
  captureConfig: CaptureConfig | null | undefined
): Promise<ComponentStatus> => {
  const index = captureConfig?.index ?? CAPTURE_LOG_INDEX_DEFAULT;
  let exists = false;
  let hasRecentData = false;

  try {
    const existsResponse = await esClient.indices.exists({ index });
    exists = existsResponse;

    if (exists) {
      const countResponse = await esClient.count({
        index,
        query: { range: { '@timestamp': { gte: 'now-7d' } } },
      });
      hasRecentData = countResponse.count > 0;
    }
  } catch {
    // Index may not exist yet
  }

  const introspectedLabel = captureConfig?.updatedAt ? `Introspected` : 'Not yet introspected';

  if (!exists) {
    return {
      id: 'log_source',
      label: introspectedLabel,
      state: 'missing',
      detail: `Index ${index} does not exist.`,
      repairable: false,
    };
  }

  if (!hasRecentData) {
    return {
      id: 'log_source',
      label: introspectedLabel,
      state: 'warning',
      detail: `Index ${index} exists but has no data in the last 7 days. The capture workflow will run but may not find any patterns.`,
      repairable: false,
    };
  }

  return {
    id: 'log_source',
    label: introspectedLabel,
    state: 'ok',
    detail: captureConfig?.updatedAt,
    repairable: false,
  };
};
