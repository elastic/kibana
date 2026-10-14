/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-security';

export default createPlaywrightConfig({
  testDir: './tests',
  // Wires `tests/global.setup.ts` / `tests/global.teardown.ts`, which enable and revert the
  // process-wide feature flag once per run
  runGlobalSetup: true,
});
