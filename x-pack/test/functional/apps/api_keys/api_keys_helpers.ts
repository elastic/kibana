/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';

export default async function clearAllApiKeys(esClient: Client, logger: ToolingLog) {
  const existingKeys = await esClient.security.queryApiKeys();
  if (existingKeys.count > 0) {
    await Promise.all(
      existingKeys.api_keys.map(async (key) => {
        esClient.security.invalidateApiKey({ ids: [key.id] });
      })
    );
  } else {
    logger.debug('No API keys to delete.');
  }
}
