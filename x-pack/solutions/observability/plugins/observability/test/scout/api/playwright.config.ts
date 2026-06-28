/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<<< HEAD:x-pack/solutions/observability/plugins/observability/test/scout/api/playwright.config.ts
import { createPlaywrightConfig } from '@kbn/scout-oblt';

export default createPlaywrightConfig({
  testDir: './tests',
========
import { createPlaywrightConfig } from '@kbn/scout';
export default createPlaywrightConfig({
  testDir: './tests',
  workers: 1,
>>>>>>>> 9.4:x-pack/platform/plugins/shared/alerting/test/scout/api/playwright.config.ts
});
