/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/dev-utils';

export default async function clearAllApiKeys(esClient: Client, logger: ToolingLog) {
  const existingKeys = await esClient.security.queryApiKeys();
  if (existingKeys.count > 0) {
    await Promise.all(
      // The type for key is not available yet. Using any for the time being.
      existingKeys.api_keys.map(async (key: any) => {
        esClient.security.invalidateApiKey({ ids: [key.id] });
      })
    );
  } else {
    logger.debug('No API keys to delete.');
  }
}
