/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');
// Cypress installs a CommonJS TypeScript loader that cannot resolve del's ESM dependency graph.
require('del');
require('./run_cypress/parallel').cli();
