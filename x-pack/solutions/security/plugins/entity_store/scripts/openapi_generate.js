/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');
const { resolve } = require('path');
const { generate } = require('@kbn/openapi-generator');

const ROOT = resolve(__dirname, '..');

(async () => {
  await generate({
    title: 'OpenAPI Entity Store Schemas',
    rootDir: ROOT,
    sourceGlob: './common/**/*.schema.yaml',
    templateName: 'zod_operation_schema',
  });
})();
