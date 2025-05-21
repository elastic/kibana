/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pRetry from 'p-retry';

// index.refresh_interval
// https://www.elastic.co/guide/en/elasticsearch/reference/8.9/index-modules.html#dynamic-index-settings
const DEFAULT_INDEX_REFRESH_TIME = 1000;

/**
 * retries until list/list item has been re-indexed
 * After migration to data stream and using update_by_query, delete_by_query which do support only refresh=true/false,
 * this utility needed response back when updates/delete applied
 * @param fn execution function to retry
 */
export const waitUntilDocumentIndexed = async (fn: () => Promise<void>): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, DEFAULT_INDEX_REFRESH_TIME));
  await pRetry(fn, {
    minTimeout: DEFAULT_INDEX_REFRESH_TIME,
    retries: 5,
  });
};
