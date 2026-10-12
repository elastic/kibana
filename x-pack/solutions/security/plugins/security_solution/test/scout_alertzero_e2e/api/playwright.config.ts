/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-security';

/**
 * Sequential: the flows share one Worker, one proposals queue and one set of seeded alerts, and
 * each waits on real model calls. Needs the `alertzero_e2e` server config set (EIS models).
 */
export default createPlaywrightConfig({
  testDir: './tests',
  workers: 1,
});
