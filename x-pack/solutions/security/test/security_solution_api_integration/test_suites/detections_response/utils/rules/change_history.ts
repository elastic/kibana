/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { DATA_STREAM_NAME } from '@kbn/change-history';
import { asKibanaClient } from '@kbn/change-history/test_utils';

export const clearChangeHistory = async (client: Client): Promise<void> => {
  try {
    await asKibanaClient(client).deleteByQuery({
      index: DATA_STREAM_NAME,
      query: { match_all: {} },
      conflicts: 'proceed',
      refresh: true,
    });
  } catch {
    // Change history index may not exist yet
  }
};

export const refreshChangeHistory = async (client: Client): Promise<void> => {
  await asKibanaClient(client).indices.refresh({
    index: DATA_STREAM_NAME,
    ignore_unavailable: true,
  });
};

export const countChangeHistory = async (client: Client): Promise<number> => {
  const { count } = await asKibanaClient(client).count({
    index: DATA_STREAM_NAME,
    ignore_unavailable: true,
  });
  return count;
};
