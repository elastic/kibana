/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-security';

/** Sequential: these suites toggle server-wide feature flags, which parallel workers would share. */
export default createPlaywrightConfig({
  testDir: './tests',
  workers: 1,
});
