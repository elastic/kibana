/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { createKbnVitestConfig } = require('@kbn/test/vitest/preset');

module.exports = createKbnVitestConfig({
  environment: 'jsdom',
  roots: ['x-pack/solutions/security/plugins/kubernetes_security'],
  setupFiles: ['jest-canvas-mock'],
});
