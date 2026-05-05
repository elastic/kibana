/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Matches @kbn/test `systemIndicesSuperuser` without pulling in @kbn/test (avoids
// heavy transitive imports during Cypress tsx config load).
export const systemIndicesTestUser = {
  username: process.env.TEST_ES_SYSTEM_INDICES_USER || 'system_indices_superuser',
  password: process.env.TEST_ES_PASS || 'changeme',
};
