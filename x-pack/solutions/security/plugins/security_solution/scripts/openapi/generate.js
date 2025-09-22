/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../../../../src/setup_node_env');
const { generate } = require('@kbn/openapi-generator');
const { REPO_ROOT } = require('@kbn/repo-info');
const { resolve, join } = require('path');

const SECURITY_SOLUTION_ROOT = resolve(__dirname, '../..');

// This script is also run in CI: to track down the scripts that run it in CI, code search for `yarn openapi:generate` in the `.buildkite` top level directory

(async () => {
  await generate({
    title: 'API route schemas',
    rootDir: SECURITY_SOLUTION_ROOT,
    sourceGlob: './common/**/*.schema.yaml',
    templateName: 'zod_operation_schema',
  });

  await generate({
    title: 'API client for tests',
    rootDir: SECURITY_SOLUTION_ROOT,
    sourceGlob: './common/**/*.schema.yaml',
    templateName: 'api_client_supertest',
    skipLinting: true,
    bundle: {
      outFile: join(
        REPO_ROOT,
        'x-pack/solutions/security/packages/test-api-clients/api/security_solution_api.gen.ts'
      ),
    },
  });

  await generate({
    title: 'Detections API client for tests',
    rootDir: SECURITY_SOLUTION_ROOT,
    sourceGlob: join(SECURITY_SOLUTION_ROOT, 'common/api/detection_engine/**/*.schema.yaml'),
    templateName: 'api_client_supertest',
    skipLinting: true,
    bundle: {
      outFile: join(
        REPO_ROOT,
        'x-pack/solutions/security/packages/test-api-clients/api/detections_api.gen.ts'
      ),
    },
  });

  await generate({
    title: 'Endpoint Management API client for tests',
    rootDir: SECURITY_SOLUTION_ROOT,
    sourceGlob: join(SECURITY_SOLUTION_ROOT, 'common/api/endpoint/**/*.schema.yaml'),
    templateName: 'api_client_supertest',
    skipLinting: true,
    bundle: {
      outFile: join(
        REPO_ROOT,
        'x-pack/solutions/security/packages/test-api-clients/api/endpoint_management_api.gen.ts'
      ),
    },
  });

  await generate({
    title: 'Entity Analytics API client for tests',
    rootDir: SECURITY_SOLUTION_ROOT,
    sourceGlob: join(SECURITY_SOLUTION_ROOT, 'common/api/entity_analytics/**/*.schema.yaml'),
    templateName: 'api_client_supertest',
    skipLinting: true,
    bundle: {
      outFile: join(
        REPO_ROOT,
        'x-pack/solutions/security/packages/test-api-clients/api/entity_analytics_api.gen.ts'
      ),
    },
  });

  await generate({
    title: 'Timelines API client for tests',
    rootDir: SECURITY_SOLUTION_ROOT,
    sourceGlob: join(SECURITY_SOLUTION_ROOT, 'common/api/timeline/**/*.schema.yaml'),
    templateName: 'api_client_supertest',
    skipLinting: true,
    bundle: {
      outFile: join(
        REPO_ROOT,
        'x-pack/solutions/security/packages/test-api-clients/api/timelines_api.gen.ts'
      ),
    },
  });

  await generate({
    title: 'API client for quickstart',
    rootDir: SECURITY_SOLUTION_ROOT,
    sourceGlob: './common/**/*.schema.yaml',
    templateName: 'api_client_quickstart',
    skipLinting: false,
    bundle: {
      outFile: join(
        REPO_ROOT,
        'x-pack/solutions/security/plugins/security_solution/common/api/quickstart_client.gen.ts'
      ),
    },
  });
})();
