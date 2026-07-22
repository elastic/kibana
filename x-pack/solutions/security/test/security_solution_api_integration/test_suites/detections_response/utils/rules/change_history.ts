/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { DATA_STREAM_NAME } from '@kbn/change-history';
import { asKibanaClient } from '@kbn/change-history/test_utils';

/**
 * `.kibana_change_history` is a system data stream, so direct test access must
 * carry the Kibana product-origin header (see {@link asKibanaClient}). These
 * helpers are shared across the rule change-history FTR suites.
 */

export const refreshHistory = async (es: Client): Promise<void> => {
  await asKibanaClient(es).indices.refresh({
    index: DATA_STREAM_NAME,
    ignore_unavailable: true,
  });
};

export const clearHistory = async (es: Client): Promise<void> => {
  try {
    await asKibanaClient(es).deleteByQuery({
      index: DATA_STREAM_NAME,
      query: { match_all: {} },
      conflicts: 'proceed',
      refresh: true,
    });
  } catch {
    // Change history index may not exist yet
  }
};

export const countHistory = async (es: Client): Promise<number> => {
  const { count } = await asKibanaClient(es).count({
    index: DATA_STREAM_NAME,
    ignore_unavailable: true,
  });
  return count;
};
