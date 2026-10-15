/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-security';

/**
 * Runs against the `security_audit` Scout server config set (Kibana writes audit events to a local
 * JSON file), which Scout selects from the `test/scout_security_audit` path.
 */
export default createPlaywrightConfig({
  testDir: './tests',
});
