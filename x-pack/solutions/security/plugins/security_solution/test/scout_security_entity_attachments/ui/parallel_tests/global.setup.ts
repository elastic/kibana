/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-security';

// The entity-attachment UI tests seed their own host entity into the entity store
// per suite (beforeAll) and drive the flyout via a rison URL param, so no shared
// Elasticsearch data needs to be loaded globally.
globalSetupHook('Setup', async ({ log }) => {
  log.info('[setup] Entity attachment cases UI tests: no shared data ingestion required');
});
