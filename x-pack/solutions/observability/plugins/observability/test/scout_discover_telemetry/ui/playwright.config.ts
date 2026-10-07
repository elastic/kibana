/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-oblt';

/**
 * `scout_discover_telemetry` is load-bearing: Scout derives the server config set from the
 * directory name, and that set boots the analytics FTR helpers plugin. Renaming the directory
 * falls back to the default set, where `window.__analytics_ftr_helpers__` is missing.
 */
export default createPlaywrightConfig({
  testDir: './tests',
  runGlobalSetup: true,
});
