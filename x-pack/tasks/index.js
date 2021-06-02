/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { build } from './build';
import { clean, cleanTest } from './clean';
import { dev } from './dev';
import { test, testbrowser, testbrowserDev, testonly, testserver } from './test';

export const tasks = {
  build,
  clean,
  'clean:test': cleanTest,
  dev,
  test,
  testbrowser,
  'testbrowser:dev': testbrowserDev,
  testonly,
  testserver,
};
