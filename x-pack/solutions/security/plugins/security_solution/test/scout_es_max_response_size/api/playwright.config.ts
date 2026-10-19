/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-security';

/**
 * Runs against the `es_max_response_size` Scout server config set (Kibana started with a small
 * `elasticsearch.maxResponseSize`), which Scout selects from the `test/scout_es_max_response_size` path.
 */
export default createPlaywrightConfig({
  testDir: './tests',
});
