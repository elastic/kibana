/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import { waitFor } from './wait_for';

/**
 * Waits for the given index to contain documents
 *
 * @param esClient elasticsearch {@link Client}
 * @param index name of the index to query
 */
export const waitForIndexToPopulate = async (
  es: Client,
  log: ToolingLog,
  index: string
): Promise<void> => {
  await waitFor(
    async () => {
      const response = await es.count({ index });
      return response.count > 0;
    },
    `waitForIndexToPopulate: ${index}`,
    log
  );
};
