/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { assertLookupNames } from './get_lookup_index';

/**
 * Delete a value list's concrete lookup index. Runs as the provisioning client, so the
 * name is checked to be one this module built. A missing index is not a failure (a
 * rerun after an interrupted delete); any other error, including one Elasticsearch
 * reports for an index the client cannot see, is raised rather than treated as done.
 */
export const deleteLookupIndex = async ({
  esClient,
  index,
}: {
  esClient: ElasticsearchClient;
  index: string;
}): Promise<void> => {
  assertLookupNames({ index });
  await esClient.indices.delete({ index }).catch((err: { meta?: { statusCode?: number } }) => {
    if (err?.meta?.statusCode === 404) return;
    throw err;
  });
};
