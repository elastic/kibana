/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';

import supertest from 'supertest';

/**
 * supertest provider that doesn't include user credentials into base URL that is passed
 * to the supertest. It's used to test API behaviour for not yet authenticated user.
 */
export function SupertestWithoutAuthProvider({ getService }) {
  const config = getService('config');
  const kibanaServerConfig = config.get('servers.kibana');

  return supertest(
    formatUrl({
      ...kibanaServerConfig,
      auth: false,
    })
  );
}
