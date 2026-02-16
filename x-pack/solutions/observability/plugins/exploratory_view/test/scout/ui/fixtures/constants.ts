/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ES_ARCHIVES = {
  // SYNTHETICS_FULL_HEARTBEAT:
  //   'x-pack/solutions/observability/plugins/synthetics/e2e/fixtures/es_archiver/full_heartbeat',
  // SYNTHETICS_BROWSER:
  //   'x-pack/solutions/observability/plugins/synthetics/e2e/fixtures/es_archiver/browser',
  RUM_8_0_0: 'x-pack/solutions/observability/plugins/ux/e2e/fixtures/rum_8.0.0',
  RUM_TEST_DATA: 'x-pack/solutions/observability/plugins/ux/e2e/fixtures/rum_test_data',
  FULL_HEARTBEAT:
    'x-pack/solutions/observability/plugins/synthetics/e2e/fixtures/es_archiver/full_heartbeat',
  BROWSER: 'x-pack/solutions/observability/plugins/synthetics/e2e/fixtures/es_archiver/browser',
} as const;

export const SYNTHETICS_TIME_RANGE = {
  // Covers both ES archives used by this suite:
  // - full_heartbeat: 2019-09-11T03:31..03:40Z
  // - browser:        2021-11-21T22:07..22:09Z
  from: '2019-09-11T00:00:00.000Z',
  to: '2021-11-22T00:00:00.000Z',
} as const;

// await syntheticsRunner.loadTestData(
//   `${REPO_ROOT}/x-pack/solutions/observability/plugins/ux/e2e/fixtures/`,
//   ['rum_8.0.0', 'rum_test_data']
// );
// await syntheticsRunner.loadTestData(
//   `${REPO_ROOT}/x-pack/solutions/observability/plugins/synthetics/e2e/fixtures/es_archiver/`,
//   ['full_heartbeat', 'browser']
// );
