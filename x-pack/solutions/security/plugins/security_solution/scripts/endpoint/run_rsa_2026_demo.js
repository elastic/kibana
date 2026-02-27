#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');
try {
  const mod = require('./rsa_2026_demo');
  mod.cli();
} catch (error) {
  console.error('Error loading or running CLI:');
  console.error(error);
  process.exitCode = 1;
}
