/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-security';

// The `test/scout_alertzero` directory name selects the `alertzero` server config
// set, which is the only stateful-classic config that enables the plugin whose
// managed workflows this suite asserts on.
export default createPlaywrightConfig({
  testDir: './tests',
});
