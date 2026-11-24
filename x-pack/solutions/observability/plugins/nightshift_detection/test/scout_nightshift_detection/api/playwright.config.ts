/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-oblt';

export default createPlaywrightConfig({
  testDir: './tests',
  // `global.setup.ts` sets the default space up with the detection service account, which every
  // tick runs as.
  runGlobalSetup: true,
});
