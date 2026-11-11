/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-oblt';

export default createPlaywrightConfig({
  testDir: './tests',
  // `global.setup.ts` sets the space up with the Nightshift service accounts, which every
  // investigation this suite starts runs as.
  runGlobalSetup: true,
});
