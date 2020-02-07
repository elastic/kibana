/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { format as formatUrl } from 'url';

import supertestAsPromised from 'supertest-as-promised';

/**
 * Supertest provider that doesn't include user credentials into base URL that is passed
 * to the supertest.
 */
export function EsSupertestWithoutAuthProvider({ getService }) {
  const config = getService('config');
  const elasticsearchServerConfig = config.get('servers.elasticsearch');

  return supertestAsPromised(
    formatUrl({
      ...elasticsearchServerConfig,
      auth: false,
    })
  );
}
