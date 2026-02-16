/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ES_ARCHIVES = {
  RUM_8_0_0: 'x-pack/solutions/observability/plugins/ux/e2e/fixtures/rum_8.0.0',
  RUM_TEST_DATA: 'x-pack/solutions/observability/plugins/ux/e2e/fixtures/rum_test_data',
  FULL_HEARTBEAT:
    'x-pack/solutions/observability/plugins/synthetics/e2e/fixtures/es_archiver/full_heartbeat',
  BROWSER: 'x-pack/solutions/observability/plugins/synthetics/e2e/fixtures/es_archiver/browser',
} as const;
