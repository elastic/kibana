/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { format as formatUrl } from 'url';

import supertestAsPromised from 'supertest-as-promised';

/**
 * Supertest provider that doesn't include user credentials into base URL that is passed
 * to the supertest. It's used to test API behaviour for not yet authenticated user.
 */
export function SupertestWithoutAuthProvider({ getService }) {
  const config = getService('config');
  const kibanaServerConfig = config.get('servers.kibana');

  return supertestAsPromised(
    formatUrl({
      ...kibanaServerConfig,
      auth: false,
    })
  );
}
