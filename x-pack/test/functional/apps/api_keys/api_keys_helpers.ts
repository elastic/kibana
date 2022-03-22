/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default async function clearAllApiKeys() {
  const existingKeys = await es.security.queryApiKeys();
  if (existingKeys.count > 0) {
    await Promise.all(
      existingKeys.api_keys.map(async (key) => {
        es.security.invalidateApiKey({ ids: [key.id] });
      })
    );
  } else {
    log.debug('No API keys to delete.');
  }
}
