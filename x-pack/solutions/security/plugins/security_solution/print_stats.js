/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const v8 = require('v8');

const heapSize = v8.getHeapStatistics().heap_size_limit / 1024 / 1024;
const nodeOptions = process.env.NODE_OPTIONS || '';
const configVariables = process.config.variables || {};

console.log({
  heapSizeMB: heapSize,
  nodeOptions,
  configVariables,
  arch: process.arch,
  platform: process.platform,
  version: process.version,
  versions: process.versions,
  release: process.release,
});
