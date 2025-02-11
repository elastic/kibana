/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../../../src/setup_node_env');
// eslint-disable-next-line import/no-nodejs-modules
const { join, resolve } = require('path');
const { bundle } = require('@kbn/openapi-bundler');

const ROOT = resolve(__dirname, '..');

(async () => {
  await bundle({
    sourceGlob: join(ROOT, 'api/**/*.schema.yaml'),
    outputFilePath: join(
      ROOT,
      'docs/openapi/serverless/security_solution_lists_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['serverless'],
      prototypeDocument: join(ROOT, 'scripts/openapi_bundle_info/lists_serverless.info.yaml'),
    },
  });

  await bundle({
    sourceGlob: join(ROOT, 'api/**/*.schema.yaml'),
    outputFilePath: join(
      ROOT,
      'docs/openapi/ess/security_solution_lists_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['ess'],
      prototypeDocument: join(ROOT, 'scripts/openapi_bundle_info/lists_ess.info.yaml'),
    },
  });
})();
